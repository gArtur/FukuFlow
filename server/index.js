const express = require('express');
const path = require('path');
const cors = require('cors');

const helmet = require('helmet');
const config = require('./config');
const { initializeDb, seedCategories, seedSettings, syncAssets } = require('./db');

// Import middleware
const { apiLimiter } = require('./middleware/rateLimiter');
const { authMiddleware } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// Import route modules
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const personsRoutes = require('./routes/persons');
const categoriesRoutes = require('./routes/categories');
const assetsRoutes = require('./routes/assets');
const snapshotsRoutes = require('./routes/snapshots');
const backupRoutes = require('./routes/backup');

// Detect if we are running in a packaged environment (pkg)
const isPkg = typeof process.pkg !== 'undefined';
const isProduction = config.isProduction || isPkg;

// Express app setup
const app = express();

// ============================================
// SECURITY MIDDLEWARE (order matters!)
// ============================================

// Security headers
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
        }
    } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
    hsts: false, // Don't force HTTPS since many self-hosted users don't use it
}));

// CORS configuration
app.use(cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));

// Rate limiting (applies to all /api routes)
app.use('/api', apiLimiter);

// ============================================
// STATIC ASSETS (Production Only)
// ============================================

if (isProduction) {
    // Serve static files from the React frontend app
    // When in pkg, __dirname points to the virtual filesystem inside the exe
    // We assume 'dist' is adjacent to 'server' in the build or packaged correctly
    app.use(express.static(path.join(__dirname, '../dist')));
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

initializeDb();
setTimeout(() => {
    seedCategories();
    seedSettings();
    syncAssets();
}, 500);

// ============================================
// ROUTES
// ============================================

// Auth routes (unprotected - handled internally)
app.use('/api/auth', authRoutes);

// Health check (unprotected)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Client Logging (unprotected - allows catching React startup errors before auth)
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

// Authentication middleware for protected api routes
app.use('/api', authMiddleware);

// Protected routes
app.use('/api/settings', settingsRoutes);
app.use('/api/persons', personsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/snapshots', snapshotsRoutes);
app.use('/api/backup', backupRoutes);

// ============================================
// SPA CATCH-ALL (Production Only)
// ============================================

if (isProduction) {
    // Anything that doesn't match the above routes, send back index.html
    // In Express 5 (path-to-regexp v8), '*' must be part of a captured group or written as /(.*)/
    // For SPA catch-all, we can use a splat capture
    app.get([/^(?!\/api).+/], (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// ============================================
// ERROR HANDLING (must be last)
// ============================================

app.use(errorHandler);

// ============================================
// SERVER START
// ============================================

const server = app.listen(config.port, config.host, async () => {
    // Always use localhost for opening the browser, even if binding to 0.0.0.0
    const url = `http://localhost:${config.port}`;
    console.log(`Server running on http://${config.host}:${config.port}`);

    // Initialize System Tray (only for packaged exe, not Docker)
    if (isPkg) {
        try {
            const TrayManager = require('./tray');
            const tray = new TrayManager(config.port);
            await tray.initialize();
        } catch (err) {
            console.error('Failed to initialize system tray:', err);
        }
    }

    if (isPkg) {
        try {
            // Use native Windows command to open default browser if tray fails or as backup
            // But tray handles opening, so maybe we only do auto-open if configured?
            // For now, let's keep the auto-open on launch behavior
            const { exec } = require('child_process');
            exec(`start ${url}`, (err) => {
                if (err) {
                    // console.error('Failed to open browser:', err);
                }
            });
        } catch (err) {
            console.error('Failed to open browser:', err);
        }
    }
});

// Handle EADDRINUSE (Address already in use)
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log('Address in use, retrying...');
        const url = `http://localhost:${config.port}`;
        // If server is already running, just open the browser
        if (isPkg) {
            console.log('Server is already running. Opening browser...');
            const { exec } = require('child_process');
            exec(`start ${url}`, (err) => {
                if (err) console.error('Failed to open browser:', err);
                // Exit successfully after opening browser
                process.exit(0);
            });
        } else {
            console.error(`Port ${config.port} is already in use.`);
            process.exit(1);
        }
    } else {
        console.error('Server error:', e);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
