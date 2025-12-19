const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

// GET all persons
router.get('/', (req, res) => {
    db.all('SELECT * FROM persons ORDER BY displayOrder ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST create person
router.post('/', (req, res) => {
    const { id, name } = req.body;
    const personId = id || uuidv4();

    db.get('SELECT MAX(displayOrder) as maxOrder FROM persons', [], (err, row) => {
        const nextOrder = (row && row.maxOrder !== null) ? row.maxOrder + 1 : 0;

        db.run('INSERT INTO persons (id, name, displayOrder) VALUES (?, ?, ?)', [personId, name, nextOrder], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: personId, name, displayOrder: nextOrder });
        });
    });
});

// PUT reorder persons
router.put('/reorder', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
        return res.status(400).json({ error: 'ids must be an array' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare('UPDATE persons SET displayOrder = ? WHERE id = ?');

        ids.forEach((id, index) => {
            stmt.run(index, id);
        });

        stmt.finalize((err) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }
            db.run('COMMIT', () => {
                res.json({ message: 'Reorder successful', ids });
            });
        });
    });
});

// PUT update person
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, displayOrder } = req.body;

    if (name !== undefined && displayOrder !== undefined) {
        db.run('UPDATE persons SET name = ?, displayOrder = ? WHERE id = ?', [name, displayOrder, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, name, displayOrder });
        });
    } else if (name !== undefined) {
        db.run('UPDATE persons SET name = ? WHERE id = ?', [name, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, name });
        });
    } else if (displayOrder !== undefined) {
        db.run('UPDATE persons SET displayOrder = ? WHERE id = ?', [displayOrder, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, displayOrder });
        });
    } else {
        res.status(400).json({ error: 'No valid fields to update' });
    }
});

// DELETE person (cascades to assets)
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.all('SELECT id FROM assets WHERE ownerId = ?', [id], (err, assets) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }

            const assetIds = assets.map(a => a.id);

            if (assetIds.length > 0) {
                const placeholders = assetIds.map(() => '?').join(',');

                db.run(`DELETE FROM asset_history WHERE assetId IN (${placeholders})`, assetIds, (err) => {
                    if (err) console.error('Error deleting history:', err);
                });

                db.run(`DELETE FROM assets WHERE id IN (${placeholders})`, assetIds, (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }
                });
            }

            db.run('DELETE FROM persons WHERE id = ?', [id], (err) => {
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

module.exports = router;
