const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { validatePerson, validatePersonUpdate, validatePersonReorder, validateUuidParam } = require('../validation/schemas');
const { promisifyDb, withTransaction } = require('../db-helpers');

// GET all persons
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    db.all('SELECT * FROM persons ORDER BY displayOrder ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch persons' });
        res.json(rows);
    });
});

// POST create person
router.post('/', validatePerson, (req, res) => {
    const db = req.app.locals.db;
    const { id, name } = req.body;
    const personId = id || uuidv4();

    db.get('SELECT MAX(displayOrder) as maxOrder FROM persons', [], (err, row) => {
        if (err) return res.status(500).json({ error: 'Failed to create person' });
        const nextOrder = (row && row.maxOrder !== null) ? row.maxOrder + 1 : 0;

        db.run('INSERT INTO persons (id, name, displayOrder) VALUES (?, ?, ?)', [personId, name, nextOrder], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to create person' });
            res.status(201).json({ id: personId, name, displayOrder: nextOrder });
        });
    });
});

// PUT reorder persons
router.put('/reorder', validatePersonReorder, async (req, res) => {
    const adb = promisifyDb(req.app.locals.db);
    const { ids } = req.body;

    try {
        await withTransaction(adb, async () => {
            for (let index = 0; index < ids.length; index++) {
                await adb.run('UPDATE persons SET displayOrder = ? WHERE id = ?', [index, ids[index]]);
            }
        });
        res.json({ message: 'Reorder successful', ids });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reorder persons' });
    }
});

// PUT update person
router.put('/:id', validateUuidParam, validatePersonUpdate, (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { name, displayOrder } = req.body;

    if (name !== undefined && displayOrder !== undefined) {
        db.run('UPDATE persons SET name = ?, displayOrder = ? WHERE id = ?', [name, displayOrder, id], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update person' });
            res.json({ id, name, displayOrder });
        });
    } else if (name !== undefined) {
        db.run('UPDATE persons SET name = ? WHERE id = ?', [name, id], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update person' });
            res.json({ id, name });
        });
    } else if (displayOrder !== undefined) {
        db.run('UPDATE persons SET displayOrder = ? WHERE id = ?', [displayOrder, id], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update person' });
            res.json({ id, displayOrder });
        });
    } else {
        res.status(400).json({ error: 'No valid fields to update' });
    }
});

// DELETE person (cascades to assets and history)
router.delete('/:id', validateUuidParam, async (req, res) => {
    const adb = promisifyDb(req.app.locals.db);
    const { id } = req.params;

    try {
        await withTransaction(adb, async () => {
            const assets = await adb.all('SELECT id FROM assets WHERE ownerId = ?', [id]);
            const assetIds = assets.map(a => a.id);

            if (assetIds.length > 0) {
                const placeholders = assetIds.map(() => '?').join(',');
                await adb.run(`DELETE FROM asset_history WHERE assetId IN (${placeholders})`, assetIds);
                await adb.run(`DELETE FROM assets WHERE id IN (${placeholders})`, assetIds);
            }

            await adb.run('DELETE FROM persons WHERE id = ?', [id]);
        });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete person' });
    }
});

module.exports = router;
