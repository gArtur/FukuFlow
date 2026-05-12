const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');

const { apiLimiter } = require('./middleware/rateLimiter');
const { authMiddleware } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const personsRoutes = require('./routes/persons');
const categoriesRoutes = require('./routes/categories');
const assetsRoutes = require('./routes/assets');
const snapshotsRoutes = require('./routes/snapshots');
const backupRoutes = require('./routes/backup');

const isPkg = typeof process.pkg !== 'undefined';
const isProduction = config.isProduction || isPkg;

function createApp(db) {
    const app = express();

    // Make db available to all route handlers via req.app.locals.db
    app.locals.db = db;

    app.use(helmet({
        contentSecurityPolicy: isProduction ? {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: null,
            }
        } : false,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        originAgentCluster: false,
        hsts: false,
    }));

    app.use(cors({
        origin: config.corsOrigin,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }));

    app.use(express.json({ limit: '50mb' }));
    app.use('/api', apiLimiter);

    if (isProduction) {
        app.use(express.static(path.join(__dirname, '../dist')));
    }

    app.use('/api/auth', authRoutes);

    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.post('/api/logs', (req, res) => {
        const { level, message, details, url, userAgent } = req.body;
        const logPrefix = '[Client]';
        let logObj = { message, details, url, userAgent };
        try {
            if (level === 'error' || level === 'fatal') {
                console.error(logPrefix, 'ERROR:', JSON.stringify(logObj, null, 2));
            } else if (level === 'warn') {
                console.warn(logPrefix, 'WARN:', JSON.stringify(logObj, null, 2));
            } else {
                console.log(logPrefix, 'INFO:', JSON.stringify(logObj, null, 2));
            }
        } catch (e) {
            console.error(logPrefix, message, details);
        }
        res.json({ success: true });
    });

    app.use('/api', authMiddleware);

    app.use('/api/settings', settingsRoutes);
    app.use('/api/persons', personsRoutes);
    app.use('/api/categories', categoriesRoutes);
    app.use('/api/assets', assetsRoutes);
    app.use('/api/snapshots', snapshotsRoutes);
    app.use('/api/backup', backupRoutes);

    if (isProduction) {
        app.get([/^(?!\/api).+/], (req, res) => {
            res.sendFile(path.join(__dirname, '../dist/index.html'));
        });
    }

    app.use(errorHandler);

    return app;
}

module.exports = { createApp };
