/**
 * Centralized Error Handling Middleware
 * Sanitizes error messages in production, detailed in development
 */
const config = require('../config');

/**
 * Error handler middleware - must be registered LAST
 */
function errorHandler(err, req, res, next) {
    // Log full error server-side (always)
    console.error('Server Error:', {
        message: err.message,
        stack: err.stack,
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
