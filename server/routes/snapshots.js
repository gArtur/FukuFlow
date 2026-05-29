const express = require('express');
const router = express.Router();
const { validateSnapshotUpdate, validateIntegerIdParam } = require('../validation/schemas');
const { promisifyDb, withTransaction, reconcileAsset } = require('../db-helpers');

// DELETE snapshot
router.delete('/:id', validateIntegerIdParam, async (req, res) => {
    const adb = promisifyDb(req.app.locals.db);
    const snapshotId = req.params.id;

    try {
        const snapshot = await adb.get('SELECT assetId FROM asset_history WHERE id = ?', [snapshotId]);
        if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

        await withTransaction(adb, async () => {
            await adb.run('DELETE FROM asset_history WHERE id = ?', [snapshotId]);
            await reconcileAsset(adb, snapshot.assetId);
        });

        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete snapshot' });
    }
});

// PUT update snapshot
router.put('/:id', validateIntegerIdParam, validateSnapshotUpdate, async (req, res) => {
    const adb = promisifyDb(req.app.locals.db);
    const snapshotId = req.params.id;
    const { date, value, investmentChange, notes } = req.body;

    try {
        const snapshot = await adb.get('SELECT assetId FROM asset_history WHERE id = ?', [snapshotId]);
        if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

        await withTransaction(adb, async () => {
            await adb.run('UPDATE asset_history SET date = ?, value = ?, investmentChange = ?, notes = ? WHERE id = ?',
                [date, value, investmentChange, notes, snapshotId]);
            await reconcileAsset(adb, snapshot.assetId);
        });

        res.json({ id: snapshotId, date, value, investmentChange, notes });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update snapshot' });
    }
});

module.exports = router;
