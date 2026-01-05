/**
 * Authentication Routes
 * Handles user setup, login, logout, and password management
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { generateToken } = require('../middleware/auth');
const { authLimiter, setupLimiter } = require('../middleware/rateLimiter');
const { validateAuthSetup, validateAuthLogin, validateAuthChangePassword } = require('../validation/schemas');

const SALT_ROUNDS = 12;

/**
 * GET /api/auth/status
 * Check if user is set up and current auth state
 */
router.get('/status', (req, res) => {
    db.get('SELECT id FROM auth WHERE id = 1', [], (err, row) => {
        if (err) {
            console.error('Auth status error:', err);
            return res.status(500).json({ error: 'Failed to check auth status' });
        }

        res.json({
            needsSetup: !row,
            isAuthenticated: false // Client should check token validity separately
        });
    });
});

/**
 * POST /api/auth/setup
 * First-time password setup (only works if no password exists)
 */
router.post('/setup', setupLimiter, validateAuthSetup, async (req, res) => {
    try {
        // Check if already set up
        const existing = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM auth WHERE id = 1', [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existing) {
            return res.status(409).json({ error: 'Password already configured' });
        }

        // Hash password
        const { password } = req.body;
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const now = new Date().toISOString();

        // Store in database
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO auth (id, passwordHash, createdAt, updatedAt) VALUES (1, ?, ?, ?)',
                [passwordHash, now, now],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Generate token with tokenVersion = 1 for new accounts
        const token = generateToken({ userId: 1, tokenVersion: 1 });

        res.status(201).json({
            message: 'Password created successfully',
            token
        });
    } catch (err) {
        console.error('Setup error:', err);
        res.status(500).json({ error: 'Failed to create password' });
    }
});

/**
 * POST /api/auth/login
 * Authenticate with password
 */
router.post('/login', authLimiter, validateAuthLogin, async (req, res) => {
    try {
        // Get stored password hash
        const auth = await new Promise((resolve, reject) => {
            db.get('SELECT passwordHash, tokenVersion FROM auth WHERE id = 1', [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!auth) {
            return res.status(400).json({ error: 'No password configured. Please set up first.' });
        }

        // Verify password
        const { password } = req.body;
        const isValid = await bcrypt.compare(password, auth.passwordHash);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Generate token with current tokenVersion
        const token = generateToken({ userId: 1, tokenVersion: auth.tokenVersion || 1 });

        res.json({
            message: 'Login successful',
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/logout
 * Client-side logout (just for API completeness)
 */
router.post('/logout', (req, res) => {
    // JWT is stateless, so logout is handled client-side by removing token
    res.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/auth/change-password
 * Change existing password (requires current password)
 */
router.post('/change-password', authLimiter, validateAuthChangePassword, async (req, res) => {
    try {
        // Get stored password hash
        const auth = await new Promise((resolve, reject) => {
            db.get('SELECT passwordHash, tokenVersion FROM auth WHERE id = 1', [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!auth) {
            return res.status(400).json({ error: 'No password configured' });
        }

        // Verify current password
        const { currentPassword, newPassword } = req.body;
        const isValid = await bcrypt.compare(currentPassword, auth.passwordHash);

        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        const now = new Date().toISOString();

        // Update password AND increment tokenVersion to invalidate old tokens
        const newTokenVersion = (auth.tokenVersion || 1) + 1;
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE auth SET passwordHash = ?, tokenVersion = ?, updatedAt = ? WHERE id = 1',
                [newHash, newTokenVersion, now],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Generate new token with new tokenVersion
        const token = generateToken({ userId: 1, tokenVersion: newTokenVersion });

        res.json({
            message: 'Password changed successfully',
            token
        });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;
