/**
 * Server Configuration
 * Loads environment variables and provides typed configuration object
 */
const path = require('path');
// Load .env from project root (one level up from this file)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Validate CORS origin in production - prevent dangerous misconfigurations
if (isProduction) {
    if (corsOrigin === '*') {
        console.error('FATAL: CORS_ORIGIN cannot be "*" in production - this allows any website to access your API');
        process.exit(1);
    }
    if (!corsOrigin.startsWith('https://')) {
        console.warn('WARNING: CORS_ORIGIN should use HTTPS in production for security');
    }
}

module.exports = {
    port: parseInt(process.env.PORT, 10) || 3001,
    corsOrigin,
    databasePath: process.env.DATABASE_PATH
        ? path.resolve(__dirname, process.env.DATABASE_PATH)
        : path.resolve(__dirname, 'db', 'wealth.db'),
    isProduction
};
