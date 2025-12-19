const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'], // Allow frontend to access
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '50mb' })); // Increased limit for backup restoration

// Database setup
const dbPath = path.resolve(__dirname, 'db', 'wealth.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDb();
    }
});

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

        // Asset History table with investmentChange and notes
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
        // using try-catch blocks effectively by ignoring errors if columns exist
        db.run(`ALTER TABLE asset_history ADD COLUMN investmentChange REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE asset_history ADD COLUMN notes TEXT`, () => { });

        // Seed data
        seedCategories();
        seedSettings();

        // Sync assets data to ensure consistency (recalculate currentValue and purchaseAmount from history)
        syncAssets();
    });
}

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

function seedSettings() {
    db.get('SELECT value FROM settings WHERE key = ?', ['currency'], (err, row) => {
        if (!row) {
            db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['currency', 'USD']);
        }
    });
}

function syncAssets() {
    // console.log('Syncing assets data...');
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

// API Endpoints

// Settings
app.get('/api/settings', (req, res) => {
    db.all('SELECT * FROM settings', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json(settings);
    });
});

app.post('/api/settings', (req, res) => {
    const { key, value } = req.body;
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ key, value });
    });
});

// Categories
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/categories', (req, res) => {
    const { label, color } = req.body;
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const id = uuidv4();

    db.run('INSERT INTO categories (id, key, label, color, isDefault) VALUES (?, ?, ?, ?, 0)',
        [id, key, label, color],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id, key, label, color, isDefault: 0 });
        }
    );
});

app.put('/api/categories/:id', (req, res) => {
    const { label, color } = req.body;
    const { id } = req.params;

    db.run('UPDATE categories SET label = ?, color = ? WHERE id = ?',
        [label, color, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, label, color });
        }
    );
});

app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;

    // Check if category is in use or is default
    db.get('SELECT isDefault, key FROM categories WHERE id = ?', [id], (err, category) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!category) return res.status(404).json({ error: 'Category not found' });
        // if (category.isDefault) return res.status(400).json({ error: 'Cannot delete default category' });

        db.get('SELECT count(*) as count FROM assets WHERE category = ?', [category.key], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row.count > 0) return res.status(400).json({ error: 'Category is in use' });

            db.run('DELETE FROM categories WHERE id = ?', [id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(204).send();
            });
        });
    });
});


// Persons
app.get('/api/persons', (req, res) => {
    db.all('SELECT * FROM persons', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/persons', (req, res) => {
    const { id, name } = req.body;
    const personId = id || uuidv4();
    db.run('INSERT INTO persons (id, name) VALUES (?, ?)', [personId, name], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: personId, name });
    });
});

app.delete('/api/persons/:id', (req, res) => {
    db.run('DELETE FROM persons WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(204).send();
    });
});

// Assets
app.get('/api/assets', (req, res) => {
    db.all('SELECT * FROM assets', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const assetsWithHistory = rows.map(asset => {
            return new Promise((resolve) => {
                db.all('SELECT id, date, value, investmentChange, notes FROM asset_history WHERE assetId = ? ORDER BY date ASC', [asset.id], (err, history) => {
                    asset.valueHistory = history || [];
                    resolve(asset);
                });
            });
        });

        Promise.all(assetsWithHistory).then(results => res.json(results));
    });
});

app.post('/api/assets', (req, res) => {
    const asset = req.body;
    const id = asset.id || uuidv4();
    const { name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol } = asset;

    db.serialize(() => {
        db.run(`INSERT INTO assets (id, name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // Add initial history entry with purchaseAmount as investmentChange
                const date = purchaseDate || new Date().toISOString();
                db.run('INSERT INTO asset_history (assetId, date, value, investmentChange, notes) VALUES (?, ?, ?, ?, ?)',
                    [id, date, currentValue, purchaseAmount, 'Initial investment'], (err) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.status(201).json({ ...asset, id, valueHistory: [{ date, value: currentValue, investmentChange: purchaseAmount, notes: 'Initial investment' }] });
                    });
            });
    });
});

app.put('/api/assets/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Only allow specific fields to be updated
    const allowedFields = ['name', 'category', 'ownerId', 'symbol'];
    const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
            obj[key] = updates[key];
            return obj;
        }, {});

    if (Object.keys(filteredUpdates).length === 0) {
        return res.json({ id, message: 'No valid fields provided for update' });
    }

    const fields = Object.keys(filteredUpdates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(filteredUpdates), id];

    db.run(`UPDATE assets SET ${fields} WHERE id = ?`, values, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, ...filteredUpdates });
    });
});

// Add snapshot endpoint
app.post('/api/assets/:id/snapshot', (req, res) => {
    const { id } = req.params;
    const { value, date = new Date().toISOString(), investmentChange = 0, notes = '' } = req.body;

    db.serialize(() => {
        // First get current asset to update purchase amount
        db.get('SELECT purchaseAmount FROM assets WHERE id = ?', [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Asset not found' });

            const newPurchaseAmount = row.purchaseAmount + investmentChange;

            // Update purchaseAmount first
            db.run('UPDATE assets SET purchaseAmount = ? WHERE id = ?', [newPurchaseAmount, id], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // Insert the new snapshot
                db.run('INSERT INTO asset_history (assetId, date, value, investmentChange, notes) VALUES (?, ?, ?, ?, ?)',
                    [id, date, value, investmentChange, notes], function (err) {
                        if (err) return res.status(500).json({ error: err.message });

                        // Now find the latest snapshot by date to update currentValue
                        db.get('SELECT value FROM asset_history WHERE assetId = ? ORDER BY date DESC LIMIT 1', [id], (err, latestSnapshot) => {
                            if (err) return res.status(500).json({ error: err.message });

                            // If we have snapshots, update currentValue to the latest one
                            if (latestSnapshot) {
                                db.run('UPDATE assets SET currentValue = ? WHERE id = ?', [latestSnapshot.value, id], (err) => {
                                    if (err) return res.status(500).json({ error: err.message });
                                    res.json({ assetId: id, date, value, investmentChange, notes });
                                });
                            } else {
                                res.json({ assetId: id, date, value, investmentChange, notes });
                            }
                        });
                    });
            });
        });
    });
});

// Legacy value update endpoint (for compatibility)
app.post('/api/assets/:id/value', (req, res) => {
    const { id } = req.params;
    const { value, date = new Date().toISOString() } = req.body;

    db.serialize(() => {
        db.run('UPDATE assets SET currentValue = ? WHERE id = ?', [value, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            db.run('INSERT INTO asset_history (assetId, date, value, investmentChange, notes) VALUES (?, ?, ?, ?, ?)',
                [id, date, value, 0, ''], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ assetId: id, date, value });
                });
        });
    });
});

app.delete('/api/assets/:id', (req, res) => {
    db.run('DELETE FROM assets WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(204).send();
    });
});

// Snapshot management endpoints
app.delete('/api/snapshots/:id', (req, res) => {
    const snapshotId = req.params.id;

    // Get the snapshot details before deleting (to adjust purchaseAmount)
    db.get('SELECT assetId, investmentChange FROM asset_history WHERE id = ?', [snapshotId], (err, snapshot) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

        // Subtract investmentChange from purchaseAmount
        db.run('UPDATE assets SET purchaseAmount = purchaseAmount - ? WHERE id = ?',
            [snapshot.investmentChange || 0, snapshot.assetId], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                db.run('DELETE FROM asset_history WHERE id = ?', [snapshotId], (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    // Update currentValue to the latest remaining snapshot
                    db.get('SELECT value FROM asset_history WHERE assetId = ? ORDER BY date DESC LIMIT 1',
                        [snapshot.assetId], (err, latest) => {
                            if (latest) {
                                db.run('UPDATE assets SET currentValue = ? WHERE id = ?', [latest.value, snapshot.assetId]);
                            }
                            res.status(204).send();
                        });
                });
            });
    });
});

app.put('/api/snapshots/:id', (req, res) => {
    const snapshotId = req.params.id;
    const { date, value, investmentChange, notes } = req.body;

    // Get old snapshot to calculate difference
    db.get('SELECT assetId, investmentChange as oldInvestmentChange FROM asset_history WHERE id = ?', [snapshotId], (err, oldSnapshot) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!oldSnapshot) return res.status(404).json({ error: 'Snapshot not found' });

        const investmentDiff = (investmentChange || 0) - (oldSnapshot.oldInvestmentChange || 0);

        db.run('UPDATE asset_history SET date = ?, value = ?, investmentChange = ?, notes = ? WHERE id = ?',
            [date, value, investmentChange, notes, snapshotId], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // Update purchaseAmount with the difference
                db.run('UPDATE assets SET purchaseAmount = purchaseAmount + ? WHERE id = ?',
                    [investmentDiff, oldSnapshot.assetId], (err) => {
                        if (err) return res.status(500).json({ error: err.message });

                        // Update currentValue if this was the latest snapshot
                        db.get('SELECT id, value FROM asset_history WHERE assetId = ? ORDER BY date DESC LIMIT 1',
                            [oldSnapshot.assetId], (err, latest) => {
                                if (latest && latest.id == snapshotId) {
                                    db.run('UPDATE assets SET currentValue = ? WHERE id = ?', [value, oldSnapshot.assetId]);
                                }
                                res.json({ id: snapshotId, date, value, investmentChange, notes });
                            });
                    });
            });
    });
});

// Backup & Restore
app.get('/api/backup', (req, res) => {
    const backup = {
        persons: [],
        assets: [],
        history: [],
        categories: [],
        settings: []
    };

    db.serialize(() => {
        db.all('SELECT * FROM persons', (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            backup.persons = rows;

            db.all('SELECT * FROM assets', (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                backup.assets = rows;

                db.all('SELECT * FROM asset_history', (err, rows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    backup.history = rows;

                    db.all('SELECT * FROM categories', (err, rows) => {
                        if (err) return res.status(500).json({ error: err.message });
                        backup.categories = rows;

                        db.all('SELECT * FROM settings', (err, rows) => {
                            if (err) return res.status(500).json({ error: err.message });
                            backup.settings = rows;
                            res.json(backup);
                        });
                    });
                });
            });
        });
    });
});

app.post('/api/restore', (req, res) => {
    const backup = req.body;

    // Simple validation
    if (!backup.persons || !backup.assets || !backup.history || !backup.categories) {
        return res.status(400).json({ error: 'Invalid backup format' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        try {
            // Clear existing tables
            db.run('DELETE FROM asset_history');
            db.run('DELETE FROM assets');
            db.run('DELETE FROM persons');
            db.run('DELETE FROM categories');
            db.run('DELETE FROM settings');

            // Restore Persons
            const stmtPersons = db.prepare('INSERT INTO persons (id, name) VALUES (?, ?)');
            backup.persons.forEach(p => stmtPersons.run(p.id, p.name));
            stmtPersons.finalize();

            // Restore Categories
            const stmtCategories = db.prepare('INSERT INTO categories (id, key, label, color, isDefault) VALUES (?, ?, ?, ?, ?)');
            backup.categories.forEach(c => stmtCategories.run(c.id, c.key, c.label, c.color, c.isDefault));
            stmtCategories.finalize();

            // Restore Settings
            if (backup.settings) {
                const stmtSettings = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
                backup.settings.forEach(s => stmtSettings.run(s.key, s.value));
                stmtSettings.finalize();
            }

            // Restore Assets
            const stmtAssets = db.prepare(`INSERT INTO assets (id, name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol) 
                                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            backup.assets.forEach(a => stmtAssets.run(a.id, a.name, a.category, a.ownerId, a.purchaseAmount, a.purchaseDate, a.currentValue, a.symbol));
            stmtAssets.finalize();

            // Restore History
            const stmtHistory = db.prepare(`INSERT INTO asset_history (id, assetId, date, value, investmentChange, notes) 
                                            VALUES (?, ?, ?, ?, ?, ?)`);
            backup.history.forEach(h => stmtHistory.run(h.id, h.assetId, h.date, h.value, h.investmentChange, h.notes));
            stmtHistory.finalize();

            db.run('COMMIT', () => {
                res.status(200).json({ message: 'Restore successful' });
            });

        } catch (error) {
            db.run('ROLLBACK');
            console.error('Restore failed:', error);
            res.status(500).json({ error: 'Restore failed: ' + error.message });
        }
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
