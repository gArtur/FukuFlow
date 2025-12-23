/**
 * JWT Authentication Middleware
 * Protects routes requiring authentication
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

// JWT secret - in production, use a strong secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'wealthflow-dev-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

/**
 * Generate a JWT token
 */
function generateToken(payload = {}) {
    return jwt.sign(
        { ...payload, iat: Math.floor(Date.now() / 1000) },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
}

/**
 * Verify and decode a JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

/**
 * Authentication middleware
 * Checks for valid JWT in Authorization header
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

    // Attach decoded token to request
    req.user = decoded;
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    authMiddleware,
    JWT_SECRET
};
