const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { validateAsset, validateAssetUpdate, validateSnapshot, validateUuidParam } = require('../validation/schemas');
const { promisifyDb, withTransaction, reconcileAsset } = require('../db-helpers');

const ALLOWED_ASSET_UPDATE_FIELDS = Object.freeze(new Set(['name', 'category', 'ownerId', 'symbol']));

// GET all assets with history
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    db.all(`
        SELECT a.id, a.name, a.category, a.ownerId, a.purchaseAmount,
               a.purchaseDate, a.currentValue, a.symbol,
               h.id as historyId, h.date as historyDate, h.value as historyValue,
               h.investmentChange, h.notes
        FROM assets a
        LEFT JOIN asset_history h ON a.id = h.assetId
        ORDER BY a.id, h.date ASC, h.id ASC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch assets' });

        const assetsMap = new Map();
        rows.forEach(row => {
            if (!assetsMap.has(row.id)) {
                assetsMap.set(row.id, {
                    id: row.id, name: row.name, category: row.category,
                    ownerId: row.ownerId, purchaseAmount: row.purchaseAmount,
                    purchaseDate: row.purchaseDate, currentValue: row.currentValue,
                    symbol: row.symbol, valueHistory: []
                });
            }
            if (row.historyId) {
                assetsMap.get(row.id).valueHistory.push({
                    id: row.historyId, date: row.historyDate, value: row.historyValue,
                    investmentChange: row.investmentChange, notes: row.notes
                });
            }
        });

        res.json(Array.from(assetsMap.values()));
    });
});

// POST create asset
router.post('/', validateAsset, (req, res) => {
    const db = req.app.locals.db;
    const asset = req.body;
    const id = asset.id || uuidv4();
    const { name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol } = asset;

    db.run(
        `INSERT INTO assets (id, name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to create asset' });
            res.status(201).json({ ...asset, id, valueHistory: [] });
        }
    );
});

// PUT update asset
router.put('/:id', validateUuidParam, validateAssetUpdate, (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    const updates = req.body;

    const filteredUpdates = {};
    for (const key of Object.keys(updates)) {
        if (ALLOWED_ASSET_UPDATE_FIELDS.has(key)) filteredUpdates[key] = updates[key];
    }

    if (Object.keys(filteredUpdates).length === 0) {
        return res.json({ id, message: 'No valid fields provided for update' });
    }

    const keys = Object.keys(filteredUpdates);
    const fields = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => filteredUpdates[k]);
    values.push(id);

    db.run(`UPDATE assets SET ${fields} WHERE id = ?`, values, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update asset' });
        res.json({ id, ...filteredUpdates });
    });
});

// POST add snapshot
router.post('/:id/snapshot', validateUuidParam, validateSnapshot, async (req, res) => {
    const adb = promisifyDb(req.app.locals.db);
    const { id } = req.params;
    const { value, date = new Date().toISOString(), investmentChange = 0, notes = '' } = req.body;

    try {
        const asset = await adb.get('SELECT id FROM assets WHERE id = ?', [id]);
        if (!asset) return res.status(404).json({ error: 'Asset not found' });

        await withTransaction(adb, async () => {
            await adb.run(
                'INSERT INTO asset_history (assetId, date, value, investmentChange, notes) VALUES (?, ?, ?, ?, ?)',
                [id, date, value, investmentChange, notes]
            );
            await reconcileAsset(adb, id);
        });

        res.json({ assetId: id, date, value, investmentChange, notes });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add snapshot' });
    }
});

// POST legacy value update
router.post('/:id/value', validateUuidParam, validateSnapshot, (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { value, date = new Date().toISOString() } = req.body;

    db.serialize(() => {
        db.run('UPDATE assets SET currentValue = ? WHERE id = ?', [value, id], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to add snapshot' });
            db.run(
                'INSERT INTO asset_history (assetId, date, value, investmentChange, notes) VALUES (?, ?, ?, ?, ?)',
                [id, date, value, 0, ''],
                (err) => {
                    if (err) return res.status(500).json({ error: 'Failed to add snapshot' });
                    res.json({ assetId: id, date, value });
                }
            );
        });
    });
});

// DELETE asset
router.delete('/:id', validateUuidParam, (req, res) => {
    const db = req.app.locals.db;
    db.run('DELETE FROM assets WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete asset' });
        res.status(204).send();
    });
});

module.exports = router;
