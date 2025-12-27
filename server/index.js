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

// Express app setup
const app = express();

// ============================================
// SECURITY MIDDLEWARE (order matters!)
// ============================================

// Security headers
// Security headers
app.use(helmet({
    contentSecurityPolicy: config.isProduction ? {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Required for inline styles and fonts
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
        }
    } : false,
    crossOriginEmbedderPolicy: false
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
// Rate limiting (applies to all /api routes)
app.use('/api', apiLimiter);

// ============================================
// STATIC ASSETS (Production Only)
// ============================================

if (config.isProduction) {
    // Serve static files from the React frontend app
    // This must be BEFORE auth middleware
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

// Authentication middleware for protected routes
// Authentication middleware for protected api routes
// Only apply to routes starting with /api that are defined after this
app.use('/api', authMiddleware);

// Protected routes
app.use('/api/settings', settingsRoutes);
app.use('/api/persons', personsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/snapshots', snapshotsRoutes);
app.use('/api/backup', backupRoutes);

app.use('/api/backup', backupRoutes);

// ============================================
// SPA CATCH-ALL (Production Only)
// ============================================

if (config.isProduction) {
    // Anything that doesn't match the above routes, send back index.html
    // This allows client-side routing to work
    app.get('*', (req, res) => {
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

const server = app.listen(config.port, config.host, () => {
    console.log(`Server running on http://${config.host}:${config.port}`);
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
