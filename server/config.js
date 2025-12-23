/**
 * Server Configuration
 * Loads environment variables and provides typed configuration object
 */
require('dotenv').config();
const path = require('path');

module.exports = {
    port: parseInt(process.env.PORT, 10) || 3001,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    databasePath: process.env.DATABASE_PATH
        ? path.resolve(__dirname, process.env.DATABASE_PATH)
        : path.resolve(__dirname, 'db', 'wealth.db'),
    isProduction: process.env.NODE_ENV === 'production'
};
