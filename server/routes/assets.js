const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

// GET all assets with history
router.get('/', (req, res) => {
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

// POST create asset
router.post('/', (req, res) => {
    const asset = req.body;
    const id = asset.id || uuidv4();
    const { name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol } = asset;

    db.run(`INSERT INTO assets (id, name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Return asset with empty valueHistory - user will add/import snapshots later
            res.status(201).json({
                ...asset,
                id,
                valueHistory: []
            });
        });
});

// PUT update asset
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;

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

// POST add snapshot
router.post('/:id/snapshot', (req, res) => {
    const { id } = req.params;
    const { value, date = new Date().toISOString(), investmentChange = 0, notes = '' } = req.body;

    db.serialize(() => {
        db.get('SELECT purchaseAmount FROM assets WHERE id = ?', [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Asset not found' });

            const newPurchaseAmount = row.purchaseAmount + investmentChange;

            db.run('UPDATE assets SET purchaseAmount = ? WHERE id = ?', [newPurchaseAmount, id], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                db.run('INSERT INTO asset_history (assetId, date, value, investmentChange, notes) VALUES (?, ?, ?, ?, ?)',
                    [id, date, value, investmentChange, notes], function (err) {
                        if (err) return res.status(500).json({ error: err.message });

                        db.get('SELECT value FROM asset_history WHERE assetId = ? ORDER BY date DESC LIMIT 1', [id], (err, latestSnapshot) => {
                            if (err) return res.status(500).json({ error: err.message });

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

// POST legacy value update
router.post('/:id/value', (req, res) => {
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

// DELETE asset
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM assets WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(204).send();
    });
});

module.exports = router;
