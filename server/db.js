const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Determine database path based on environment
let dbPath;
const appName = 'FukuFlow';

if (process.env.APPDATA) {
    // Windows
    const appDataDir = path.join(process.env.APPDATA, appName);
    if (!fs.existsSync(appDataDir)) {
        fs.mkdirSync(appDataDir, { recursive: true });
    }
    dbPath = path.join(appDataDir, 'wealth.db');
} else {
    // Fallback for dev or non-Windows (though the request is Windows specific)
    dbPath = path.resolve(__dirname, 'db', 'wealth.db');
}

console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        console.error('FATAL: Cannot start server without database connection');
        process.exit(1);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

/**
 * Initialize database tables
 */
function initializeDb() {
    db.serialize(() => {
        // Persons table
        db.run(`CREATE TABLE IF NOT EXISTS persons (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL
        )`);

        // Assets table
        db.run(`CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            ownerId TEXT NOT NULL,
            purchaseAmount REAL NOT NULL,
            purchaseDate TEXT NOT NULL,
            currentValue REAL NOT NULL,
            symbol TEXT,
            FOREIGN KEY (ownerId) REFERENCES persons(id)
        )`);

        // Asset History table
        db.run(`CREATE TABLE IF NOT EXISTS asset_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assetId TEXT NOT NULL,
            date TEXT NOT NULL,
            value REAL NOT NULL,
            investmentChange REAL DEFAULT 0,
            notes TEXT,
            FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
        )`);

        // Categories table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            key TEXT NOT NULL UNIQUE,
            label TEXT NOT NULL,
            color TEXT NOT NULL,
            isDefault INTEGER DEFAULT 0
        )`);

        // Settings table
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )`);

        // Auth table - single user only (id = 1)
        // tokenVersion is incremented on password change to invalidate old tokens
        db.run(`CREATE TABLE IF NOT EXISTS auth (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            passwordHash TEXT NOT NULL,
            tokenVersion INTEGER DEFAULT 1,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
        )`);

        // Add columns if they don't exist (for existing databases)
        db.run(`ALTER TABLE asset_history ADD COLUMN investmentChange REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE asset_history ADD COLUMN notes TEXT`, () => { });
        db.run(`ALTER TABLE persons ADD COLUMN displayOrder INTEGER DEFAULT 0`, () => { });
        db.run(`ALTER TABLE auth ADD COLUMN tokenVersion INTEGER DEFAULT 1`, () => { });
    });
}

/**
 * Seed default categories
 */
function seedCategories() {
    const defaultCategories = [
        { key: 'stocks', label: 'Stocks', color: '#6C5CE7' },
        { key: 'etf', label: 'ETFs', color: '#00D9A5' },
        { key: 'crypto', label: 'Crypto', color: '#FDCB6E' },
        { key: 'real_estate', label: 'Real Estate', color: '#E17055' },
        { key: 'bonds', label: 'Bonds', color: '#74B9FF' },
        { key: 'cash', label: 'Cash', color: '#55EFC4' },
        { key: 'other', label: 'Other', color: '#A29BFE' }
    ];

    db.get('SELECT count(*) as count FROM categories', (err, row) => {
        if (err) return console.error(err);
        if (row.count === 0) {
            console.log('Seeding categories...');
            const stmt = db.prepare('INSERT INTO categories (id, key, label, color, isDefault) VALUES (?, ?, ?, ?, 1)');
            defaultCategories.forEach(cat => {
                stmt.run(uuidv4(), cat.key, cat.label, cat.color);
            });
            stmt.finalize(() => {
                console.log('Successfully seeded default categories.');
            });
        } else {
            console.log('Categories already seeded.');
        }
    });
}

/**
 * Seed default settings
 */
function seedSettings() {
    db.get('SELECT value FROM settings WHERE key = ?', ['currency'], (err, row) => {
        if (err) return console.error('Error checking currency setting:', err);
        if (!row) {
            db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['currency', 'USD'], (err) => {
                if (err) console.error('Error seeding currency setting:', err);
                else console.log('Successfully seeded default settings.');
            });
        } else {
            console.log('Default settings already seeded.');
        }
    });
}

/**
 * Sync asset values from history - Optimized: Single aggregation query instead of N+1
 */
function syncAssets() {
    console.log('Starting asset synchronization...');
    // Single query: get latest value and total invested for all assets at once
    db.all(`
        SELECT 
            a.id,
            (SELECT h.value FROM asset_history h 
             WHERE h.assetId = a.id 
             ORDER BY h.date DESC, h.id DESC LIMIT 1) as latestValue,
            COALESCE(SUM(ah.investmentChange), 0) as totalInvested
        FROM assets a
        LEFT JOIN asset_history ah ON a.id = ah.assetId
        GROUP BY a.id
    `, [], (err, results) => {
        if (err) return console.error('Error fetching sync data:', err);

        // Batch update using prepared statement
        const stmt = db.prepare('UPDATE assets SET currentValue = ?, purchaseAmount = ? WHERE id = ?');
        let updateCount = 0;
        results.forEach(r => {
            if (r.latestValue !== null) {
                stmt.run(r.latestValue, r.totalInvested, r.id);
                updateCount++;
            }
        });
        stmt.finalize((err) => {
            if (err) console.error('Error finalizing sync statement:', err);
            else console.log(`Asset synchronization complete. Updated ${updateCount} assets.`);
        });
    });
}

module.exports = {
    db,
    initializeDb,
    seedCategories,
    seedSettings,
    syncAssets
};
