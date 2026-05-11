const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { validateCategory, validateUuidParam } = require('../validation/schemas');

// GET all categories
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    db.all('SELECT * FROM categories', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch categories' });
        res.json(rows);
    });
});

// POST create category
router.post('/', validateCategory, (req, res) => {
    const db = req.app.locals.db;
    const { label, color } = req.body;
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const id = uuidv4();

    db.run('INSERT INTO categories (id, key, label, color, isDefault) VALUES (?, ?, ?, ?, 0)',
        [id, key, label, color],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to create category' });
            res.status(201).json({ id, key, label, color, isDefault: 0 });
        }
    );
});

// PUT update category
router.put('/:id', validateUuidParam, validateCategory, (req, res) => {
    const db = req.app.locals.db;
    const { label, color } = req.body;
    const { id } = req.params;

    db.run('UPDATE categories SET label = ?, color = ? WHERE id = ?', [label, color, id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to update category' });
            res.json({ id, label, color });
        }
    );
});

// DELETE category — blocked if any asset uses it
router.delete('/:id', validateUuidParam, (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;

    db.get('SELECT key FROM categories WHERE id = ?', [id], (err, category) => {
        if (err) return res.status(500).json({ error: 'Failed to delete category' });
        if (!category) return res.status(404).json({ error: 'Category not found' });

        db.get('SELECT id FROM assets WHERE category = ? LIMIT 1', [category.key], (err, asset) => {
            if (err) return res.status(500).json({ error: 'Failed to delete category' });
            if (asset) return res.status(409).json({ error: 'Category is in use by one or more assets' });

            db.run('DELETE FROM categories WHERE id = ?', [id], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to delete category' });
                res.status(204).send();
            });
        });
    });
});

module.exports = router;
