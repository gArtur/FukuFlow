const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET backup
router.get('/', (req, res) => {
    const backup = {
        persons: [],
        assets: [],
        history: [],
        categories: [],
        settings: []
    };

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

// POST restore
router.post('/restore', (req, res) => {
    const backup = req.body;

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
            res.status(500).json({ error: 'Restore failed' });
        }
    });
});

module.exports = router;
