const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { validateSnapshotUpdate, validateIntegerIdParam } = require('../validation/schemas');

// DELETE snapshot (with integer ID validation)
router.delete('/:id', validateIntegerIdParam, (req, res) => {
    const snapshotId = req.params.id;

    db.get('SELECT assetId, investmentChange FROM asset_history WHERE id = ?', [snapshotId], (err, snapshot) => {
        if (err) return res.status(500).json({ error: 'Failed to delete snapshot' });
        if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

        db.run('UPDATE assets SET purchaseAmount = purchaseAmount - ? WHERE id = ?',
            [snapshot.investmentChange || 0, snapshot.assetId], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to delete snapshot' });

                db.run('DELETE FROM asset_history WHERE id = ?', [snapshotId], (err) => {
                    if (err) return res.status(500).json({ error: 'Failed to delete snapshot' });

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

// PUT update snapshot (with validation)
router.put('/:id', validateIntegerIdParam, validateSnapshotUpdate, (req, res) => {
    const snapshotId = req.params.id;
    const { date, value, investmentChange, notes } = req.body;

    db.get('SELECT assetId, investmentChange as oldInvestmentChange FROM asset_history WHERE id = ?', [snapshotId], (err, oldSnapshot) => {
        if (err) return res.status(500).json({ error: 'Failed to update snapshot' });
        if (!oldSnapshot) return res.status(404).json({ error: 'Snapshot not found' });

        const investmentDiff = (investmentChange || 0) - (oldSnapshot.oldInvestmentChange || 0);

        db.run('UPDATE asset_history SET date = ?, value = ?, investmentChange = ?, notes = ? WHERE id = ?',
            [date, value, investmentChange, notes, snapshotId], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to update snapshot' });

                db.run('UPDATE assets SET purchaseAmount = purchaseAmount + ? WHERE id = ?',
                    [investmentDiff, oldSnapshot.assetId], (err) => {
                        if (err) return res.status(500).json({ error: 'Failed to update snapshot' });

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

module.exports = router;
