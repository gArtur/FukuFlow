/**
 * Authentication Routes
 * Handles user setup, login, logout, and password management
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const { authLimiter, setupLimiter } = require('../middleware/rateLimiter');
const { validateAuthSetup, validateAuthLogin, validateAuthChangePassword } = require('../validation/schemas');

const SALT_ROUNDS = process.env.NODE_ENV === 'test' ? 1 : 12;

/**
 * GET /api/auth/status
 */
router.get('/status', (req, res) => {
    const db = req.app.locals.db;
    db.get('SELECT id FROM auth WHERE id = 1', [], (err, row) => {
        if (err) {
            console.error('Auth status error:', err);
            return res.status(500).json({ error: 'Failed to check auth status' });
        }
        res.json({ needsSetup: !row, isAuthenticated: false });
    });
});

/**
 * POST /api/auth/setup
 * First-time password setup (only works if no password exists)
 */
router.post('/setup', setupLimiter, validateAuthSetup, async (req, res) => {
    const db = req.app.locals.db;
    try {
        const existing = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM auth WHERE id = 1', [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existing) {
            return res.status(409).json({ error: 'Password already configured' });
        }

        const { password } = req.body;
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const now = new Date().toISOString();

        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO auth (id, passwordHash, createdAt, updatedAt) VALUES (1, ?, ?, ?)',
                [passwordHash, now, now],
                (err) => { if (err) reject(err); else resolve(); }
            );
        });

        const token = generateToken({ userId: 1, tokenVersion: 1 });
        res.status(201).json({ message: 'Password created successfully', token });
    } catch (err) {
        console.error('Setup error:', err);
        res.status(500).json({ error: 'Failed to create password' });
    }
});

/**
 * POST /api/auth/login
 */
router.post('/login', authLimiter, validateAuthLogin, async (req, res) => {
    const db = req.app.locals.db;
    try {
        const auth = await new Promise((resolve, reject) => {
            db.get('SELECT passwordHash, tokenVersion FROM auth WHERE id = 1', [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!auth) {
            return res.status(400).json({ error: 'No password configured. Please set up first.' });
        }

        const { password } = req.body;
        const isValid = await bcrypt.compare(password, auth.passwordHash);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = generateToken({ userId: 1, tokenVersion: auth.tokenVersion || 1 });
        res.json({ message: 'Login successful', token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/auth/change-password
 */
router.post('/change-password', authLimiter, validateAuthChangePassword, async (req, res) => {
    const db = req.app.locals.db;
    try {
        const auth = await new Promise((resolve, reject) => {
            db.get('SELECT passwordHash, tokenVersion FROM auth WHERE id = 1', [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!auth) {
            return res.status(400).json({ error: 'No password configured' });
        }

        const { currentPassword, newPassword } = req.body;
        const isValid = await bcrypt.compare(currentPassword, auth.passwordHash);

        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        const now = new Date().toISOString();
        const newTokenVersion = (auth.tokenVersion || 1) + 1;

        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE auth SET passwordHash = ?, tokenVersion = ?, updatedAt = ? WHERE id = 1',
                [newHash, newTokenVersion, now],
                (err) => { if (err) reject(err); else resolve(); }
            );
        });

        const token = generateToken({ userId: 1, tokenVersion: newTokenVersion });
        res.json({ message: 'Password changed successfully', token });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;
