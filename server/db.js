const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Database setup
const dbPath = path.resolve(__dirname, 'db', 'wealth.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
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

        // Add columns if they don't exist (for existing databases)
        db.run(`ALTER TABLE asset_history ADD COLUMN investmentChange REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE asset_history ADD COLUMN notes TEXT`, () => { });
        db.run(`ALTER TABLE persons ADD COLUMN displayOrder INTEGER DEFAULT 0`, () => { });
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
            stmt.finalize();
        }
    });
}

/**
 * Seed default settings
 */
function seedSettings() {
    db.get('SELECT value FROM settings WHERE key = ?', ['currency'], (err, row) => {
        if (!row) {
            db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['currency', 'USD']);
        }
    });
}

/**
 * Sync asset values from history
 */
function syncAssets() {
    db.all('SELECT id FROM assets', [], (err, assets) => {
        if (err) return console.error('Error fetching assets for sync:', err);

        assets.forEach(asset => {
            db.all('SELECT value, investmentChange, date FROM asset_history WHERE assetId = ? ORDER BY date ASC', [asset.id], (err, history) => {
                if (err) return console.error(`Error fetching history for asset ${asset.id}:`, err);
                if (!history || history.length === 0) return;

                const latestSnapshot = history[history.length - 1];
                const totalInvested = history.reduce((sum, entry) => sum + (entry.investmentChange || 0), 0);

                db.run('UPDATE assets SET currentValue = ?, purchaseAmount = ? WHERE id = ?',
                    [latestSnapshot.value, totalInvested, asset.id],
                    (err) => {
                        if (err) console.error(`Error syncing asset ${asset.id}:`, err);
                    }
                );
            });
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
