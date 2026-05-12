/**
 * Rate Limiting Middleware
 * Protects against brute-force and DoS attacks
 */
const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

// General API limiter - generous for normal usage
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest,
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skip: () => isTest,
});

// Very strict limiter for password setup (prevent setup spam)
const setupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: 'Too many setup attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest,
});

module.exports = {
    apiLimiter,
    authLimiter,
    setupLimiter
};
