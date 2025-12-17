const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

        // Add columns if they don't exist (for existing databases)
        db.run(`ALTER TABLE asset_history ADD COLUMN investmentChange REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE asset_history ADD COLUMN notes TEXT`, () => { });
    });
}

// API Endpoints

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
                db.all('SELECT date, value, investmentChange, notes FROM asset_history WHERE assetId = ? ORDER BY date ASC', [asset.id], (err, history) => {
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
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];

    db.run(`UPDATE assets SET ${fields} WHERE id = ?`, values, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, ...updates });
    });
});

// Add snapshot endpoint
app.post('/api/assets/:id/snapshot', (req, res) => {
    const { id } = req.params;
    const { value, date = new Date().toISOString(), investmentChange = 0, notes = '' } = req.body;

    db.serialize(() => {
        // Update current value and add investmentChange to purchaseAmount
        db.get('SELECT purchaseAmount FROM assets WHERE id = ?', [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Asset not found' });

            const newPurchaseAmount = row.purchaseAmount + investmentChange;

            db.run('UPDATE assets SET currentValue = ?, purchaseAmount = ? WHERE id = ?', [value, newPurchaseAmount, id], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                db.run('INSERT INTO asset_history (assetId, date, value, investmentChange, notes) VALUES (?, ?, ?, ?, ?)',
                    [id, date, value, investmentChange, notes], function (err) {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ assetId: id, date, value, investmentChange, notes });
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
