const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

// GET all assets with history - Optimized: Single JOIN query instead of N+1
router.get('/', (req, res) => {
    db.all(`
        SELECT a.id, a.name, a.category, a.ownerId, a.purchaseAmount, 
               a.purchaseDate, a.currentValue, a.symbol,
               h.id as historyId, h.date as historyDate, h.value as historyValue, 
               h.investmentChange, h.notes
        FROM assets a
        LEFT JOIN asset_history h ON a.id = h.assetId
        ORDER BY a.id, h.date ASC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Group by asset ID in memory - O(n) single pass
        const assetsMap = new Map();
        rows.forEach(row => {
            if (!assetsMap.has(row.id)) {
                assetsMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    category: row.category,
                    ownerId: row.ownerId,
                    purchaseAmount: row.purchaseAmount,
                    purchaseDate: row.purchaseDate,
                    currentValue: row.currentValue,
                    symbol: row.symbol,
                    valueHistory: []
                });
            }
            // Add history entry if it exists (LEFT JOIN may have null history)
            if (row.historyId) {
                assetsMap.get(row.id).valueHistory.push({
                    id: row.historyId,
                    date: row.historyDate,
                    value: row.historyValue,
                    investmentChange: row.investmentChange,
                    notes: row.notes
                });
            }
        });

        res.json(Array.from(assetsMap.values()));
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
