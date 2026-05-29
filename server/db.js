const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { promisifyDb, reconcileAsset } = require('./db-helpers');

// Determine database path based on environment
let dbPath;
const appName = 'FukuFlow';

if (process.env.DATABASE_PATH) {
    dbPath = path.resolve(__dirname, process.env.DATABASE_PATH);
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
} else if (process.env.APPDATA) {
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

function initSchema(database) {
    return new Promise((resolve, reject) => {
        database.serialize(() => {
            database.run(`CREATE TABLE IF NOT EXISTS persons (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                displayOrder INTEGER DEFAULT 0
            )`);
            database.run(`CREATE TABLE IF NOT EXISTS assets (
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
            database.run(`CREATE TABLE IF NOT EXISTS asset_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assetId TEXT NOT NULL,
                date TEXT NOT NULL,
                value REAL NOT NULL,
                investmentChange REAL DEFAULT 0,
                notes TEXT,
                FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
            )`);
            database.run(`CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                label TEXT NOT NULL,
                color TEXT NOT NULL,
                isDefault INTEGER DEFAULT 0
            )`);
            database.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )`);
            database.run(`CREATE TABLE IF NOT EXISTS auth (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                passwordHash TEXT NOT NULL,
                tokenVersion INTEGER DEFAULT 1,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

/**
 * Initialize database tables
 */
function initializeDb() {
    initSchema(db).then(() => {
        // Migration: add columns to existing databases that predate schema updates
        db.run(`ALTER TABLE asset_history ADD COLUMN investmentChange REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE asset_history ADD COLUMN notes TEXT`, () => { });
        db.run(`ALTER TABLE persons ADD COLUMN displayOrder INTEGER DEFAULT 0`, () => { });
        db.run(`ALTER TABLE auth ADD COLUMN tokenVersion INTEGER DEFAULT 1`, () => { });
    }).catch(err => console.error('Schema init failed:', err));
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
 * Sync every asset's derived columns from history at startup, by running the
 * same per-asset reconciliation used after each snapshot mutation.
 */
async function syncAssets() {
    console.log('Starting asset synchronization...');
    const adb = promisifyDb(db);
    try {
        const assets = await adb.all('SELECT id FROM assets');
        for (const asset of assets) {
            await reconcileAsset(adb, asset.id);
        }
        console.log(`Asset synchronization complete. Reconciled ${assets.length} assets.`);
    } catch (err) {
        console.error('Error synchronizing assets:', err);
    }
}

module.exports = {
    db,
    initSchema,
    initializeDb,
    seedCategories,
    seedSettings,
    syncAssets
};
