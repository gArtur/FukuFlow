const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET all settings
router.get('/', (req, res) => {
    db.all('SELECT * FROM settings', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json(settings);
    });
});

// POST update setting
router.post('/', (req, res) => {
    const { key, value } = req.body;
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ key, value });
    });
});

module.exports = router;
