/**
 * Rate Limiting Middleware
 * Protects against brute-force and DoS attacks
 */
const rateLimit = require('express-rate-limit');

// General API limiter - generous for normal usage
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per window
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // only 10 attempts per window
    message: { error: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // don't count successful logins
});

// Very strict limiter for password setup (prevent setup spam)
const setupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // only 5 setup attempts per hour
    message: { error: 'Too many setup attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    apiLimiter,
    authLimiter,
    setupLimiter
};
