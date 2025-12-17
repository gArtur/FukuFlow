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

        // Asset History table
        db.run(`CREATE TABLE IF NOT EXISTS asset_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assetId TEXT NOT NULL,
            date TEXT NOT NULL,
            value REAL NOT NULL,
            FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
        )`);
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

        // Fetch history for each asset (this is simplified, ideally use a join or better queries)
        const assetsWithHistory = rows.map(asset => {
            return new Promise((resolve) => {
                db.all('SELECT date, value FROM asset_history WHERE assetId = ? ORDER BY date ASC', [asset.id], (err, history) => {
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

                // Add initial history entry
                const date = new Date().toISOString();
                db.run('INSERT INTO asset_history (assetId, date, value) VALUES (?, ?, ?)', [id, date, currentValue], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.status(201).json({ ...asset, id, valueHistory: [{ date, value: currentValue }] });
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

app.post('/api/assets/:id/value', (req, res) => {
    const { id } = req.params;
    const { value, date = new Date().toISOString() } = req.body;

    db.serialize(() => {
        db.run('UPDATE assets SET currentValue = ? WHERE id = ?', [value, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            db.run('INSERT INTO asset_history (assetId, date, value) VALUES (?, ?, ?)', [id, date, value], (err) => {
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
