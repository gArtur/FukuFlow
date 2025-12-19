const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

// GET all categories
router.get('/', (req, res) => {
    db.all('SELECT * FROM categories', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST create category
router.post('/', (req, res) => {
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

// PUT update category
router.put('/:id', (req, res) => {
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

// DELETE category (cascades to assets)
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT key FROM categories WHERE id = ?', [id], (err, category) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!category) return res.status(404).json({ error: 'Category not found' });

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.all('SELECT id FROM assets WHERE category = ?', [category.key], (err, assets) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                const assetIds = assets.map(a => a.id);

                if (assetIds.length > 0) {
                    const placeholders = assetIds.map(() => '?').join(',');

                    db.run(`DELETE FROM asset_history WHERE assetId IN (${placeholders})`, assetIds, (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return console.error('Error deleting history:', err);
                        }
                    });

                    db.run(`DELETE FROM assets WHERE id IN (${placeholders})`, assetIds, (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return console.error('Error deleting assets:', err);
                        }
                    });
                }

                db.run('DELETE FROM categories WHERE id = ?', [id], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }
                    db.run('COMMIT');
                    res.status(204).send();
                });
            });
        });
    });
});

module.exports = router;
