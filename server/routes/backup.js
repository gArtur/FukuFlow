const express = require('express');
const router = express.Router();
const { validateBackupRestore } = require('../validation/schemas');
const { promisifyDb, withTransaction } = require('../db-helpers');

// GET backup
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    const backup = { persons: [], assets: [], history: [], categories: [], settings: [] };

    db.serialize(() => {
        db.all('SELECT * FROM persons', (err, rows) => {
            if (err) return res.status(500).json({ error: 'Failed to create backup' });
            backup.persons = rows;

            db.all('SELECT * FROM assets', (err, rows) => {
                if (err) return res.status(500).json({ error: 'Failed to create backup' });
                backup.assets = rows;

                db.all('SELECT * FROM asset_history', (err, rows) => {
                    if (err) return res.status(500).json({ error: 'Failed to create backup' });
                    backup.history = rows;

                    db.all('SELECT * FROM categories', (err, rows) => {
                        if (err) return res.status(500).json({ error: 'Failed to create backup' });
                        backup.categories = rows;

                        db.all('SELECT * FROM settings', (err, rows) => {
                            if (err) return res.status(500).json({ error: 'Failed to create backup' });
                            backup.settings = rows;
                            res.json(backup);
                        });
                    });
                });
            });
        });
    });
});

// POST restore - replaces all data atomically. Insert order (persons →
// categories → settings → assets → history) respects the foreign keys.
router.post('/restore', validateBackupRestore, async (req, res) => {
    const adb = promisifyDb(req.app.locals.db);
    const backup = req.body;

    try {
        await withTransaction(adb, async () => {
            await adb.run('DELETE FROM asset_history');
            await adb.run('DELETE FROM assets');
            await adb.run('DELETE FROM persons');
            await adb.run('DELETE FROM categories');
            await adb.run('DELETE FROM settings');

            for (const p of backup.persons) {
                await adb.run('INSERT INTO persons (id, name) VALUES (?, ?)', [p.id, p.name]);
            }

            for (const c of backup.categories) {
                await adb.run(
                    'INSERT INTO categories (id, key, label, color, isDefault) VALUES (?, ?, ?, ?, ?)',
                    [c.id, c.key, c.label, c.color, c.isDefault]
                );
            }

            if (backup.settings) {
                for (const s of backup.settings) {
                    await adb.run('INSERT INTO settings (key, value) VALUES (?, ?)', [s.key, s.value]);
                }
            }

            for (const a of backup.assets) {
                await adb.run(
                    `INSERT INTO assets (id, name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [a.id, a.name, a.category, a.ownerId, a.purchaseAmount, a.purchaseDate, a.currentValue, a.symbol]
                );
            }

            for (const h of backup.history) {
                await adb.run(
                    `INSERT INTO asset_history (id, assetId, date, value, investmentChange, notes) VALUES (?, ?, ?, ?, ?, ?)`,
                    [h.id, h.assetId, h.date, h.value, h.investmentChange, h.notes]
                );
            }
        });
        res.status(200).json({ message: 'Restore successful' });
    } catch (error) {
        console.error('Restore failed:', error);
        res.status(500).json({ error: 'Restore failed' });
    }
});

module.exports = router;
