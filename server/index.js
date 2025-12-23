const express = require('express');
const cors = require('cors');
const config = require('./config');
const { initializeDb, seedCategories, seedSettings, syncAssets } = require('./db');

// Import route modules
const settingsRoutes = require('./routes/settings');
const personsRoutes = require('./routes/persons');
const categoriesRoutes = require('./routes/categories');
const assetsRoutes = require('./routes/assets');
const snapshotsRoutes = require('./routes/snapshots');
const backupRoutes = require('./routes/backup');

// Express app setup
const app = express();

// Middleware
app.use(cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Initialize database
initializeDb();
setTimeout(() => {
    seedCategories();
    seedSettings();
    syncAssets();
}, 500);

// Register routes
app.use('/api/settings', settingsRoutes);
app.use('/api/persons', personsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/snapshots', snapshotsRoutes);
app.use('/api/backup', backupRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
});
