/**
 * Centralized Error Handling Middleware
 * Sanitizes error messages in production, detailed in development
 */
const config = require('../config');

/**
 * Sanitize potentially sensitive data from error messages and stacks
 */
function sanitizeForLogs(text) {
    if (!text) return text;
    return text
        .replace(/password[=:]["']?[^"',\s\n]*/gi, 'password=[REDACTED]')
        .replace(/token[=:]["']?[^"',\s\n]*/gi, 'token=[REDACTED]')
        .replace(/auth[=:]["']?[^"',\s\n]*/gi, 'auth=[REDACTED]')
        .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]')
        .replace(/secret[=:]["']?[^"',\s\n]*/gi, 'secret=[REDACTED]');
}

/**
 * Error handler middleware - must be registered LAST
 */
function errorHandler(err, req, res, next) {
    // Sanitize error details before logging
    const sanitizedMessage = sanitizeForLogs(err.message);
    const sanitizedStack = config.isProduction ? '[redacted]' : sanitizeForLogs(err.stack);

    // Log error server-side (sanitized)
    console.error('Server Error:', {
        message: sanitizedMessage,
        stack: sanitizedStack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // In production, sanitize error messages
    if (config.isProduction) {
        // Don't leak internal details
        const safeMessages = {
            400: 'Bad request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not found',
            409: 'Conflict',
            422: 'Validation error',
            429: 'Too many requests',
            500: 'Internal server error'
        };

        res.status(statusCode).json({
            error: safeMessages[statusCode] || 'An error occurred'
        });
    } else {
        // In development, show detailed error
        res.status(statusCode).json({
            error: err.message,
            stack: err.stack
        });
    }
}

/**
 * Async handler wrapper - catches async errors and forwards to error handler
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Create a custom error with status code
 */
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    errorHandler,
    asyncHandler,
    AppError
};
