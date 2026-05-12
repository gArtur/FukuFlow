const config = require('./config');
const { db, initializeDb, seedCategories, seedSettings, syncAssets } = require('./db');
const { createApp } = require('./app');

const isPkg = typeof process.pkg !== 'undefined';

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
// APP SETUP
// ============================================

const app = createApp(db);

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
