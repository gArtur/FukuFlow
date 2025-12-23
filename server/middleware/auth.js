/**
 * JWT Authentication Middleware
 * Protects routes requiring authentication
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

// JWT secret - REQUIRED in production
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// Fail fast if JWT_SECRET is not configured
if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: JWT_SECRET environment variable is required in production');
        console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
        process.exit(1);
    } else {
        console.warn('WARNING: JWT_SECRET not set. Using insecure development secret.');
        console.warn('This is NOT safe for production use!');
    }
}

// Use provided secret or clearly-marked dev-only fallback
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'DEV-ONLY-INSECURE-SECRET-DO-NOT-USE-IN-PRODUCTION';

/**
 * Generate a JWT token
 */
function generateToken(payload = {}) {
    return jwt.sign(
        { ...payload, iat: Math.floor(Date.now() / 1000) },
        EFFECTIVE_JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
}

/**
 * Verify and decode a JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, EFFECTIVE_JWT_SECRET);
    } catch (err) {
        return null;
    }
}

/**
 * Authentication middleware
 * Checks for valid JWT in Authorization header and verifies tokenVersion
 */
function authMiddleware(req, res, next) {
    // Skip auth for auth routes
    if (req.path.startsWith('/api/auth')) {
        return next();
    }

    // Skip auth for health check
    if (req.path === '/api/health') {
        return next();
    }

    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify tokenVersion matches current database version
    // This ensures tokens are invalidated when password is changed
    const { db } = require('../db');
    db.get('SELECT tokenVersion FROM auth WHERE id = 1', [], (err, row) => {
        if (err) {
            console.error('Token version check error:', err);
            return res.status(500).json({ error: 'Authentication error' });
        }

        // If no auth record or tokenVersion mismatch, reject the token
        const dbTokenVersion = row?.tokenVersion || 1;
        const tokenVersion = decoded.tokenVersion || 1;

        if (tokenVersion !== dbTokenVersion) {
            return res.status(401).json({ error: 'Token has been invalidated. Please log in again.' });
        }

        // Attach decoded token to request
        req.user = decoded;
        next();
    });
}

module.exports = {
    generateToken,
    verifyToken,
    authMiddleware,
    EFFECTIVE_JWT_SECRET
};
