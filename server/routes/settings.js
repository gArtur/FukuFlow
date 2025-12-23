const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { validateSetting } = require('../validation/schemas');

// GET all settings
router.get('/', (req, res) => {
    db.all('SELECT * FROM settings', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch settings' });
        const settings = rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json(settings);
    });
});

// POST update setting (with validation)
router.post('/', validateSetting, (req, res) => {
    const { key, value } = req.body;
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update setting' });
        res.json({ key, value });
    });
});

module.exports = router;
