const { db } = require('../server/db');
const { v4: uuidv4 } = require('uuid');

// Promisify db functions for easier async/await usage
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const USERS = [
    { name: 'Alice', role: 'self' },
    { name: 'Bob', role: 'wife' }, // Assuming mapped to 'wife' for demo
    { name: 'Charlie', role: 'daughter' } // Assuming mapped to 'daughter' for demo
];

const ASSET_TEMPLATES = [
    { category: 'stocks', name: 'Tech Growth Stock', symbol: 'TECH', annualReturn: 0.12, volatility: 0.20 },
    { category: 'stocks', name: 'Global Index ETF', symbol: 'WLD', annualReturn: 0.08, volatility: 0.12 },
    { category: 'stocks', name: 'Dividend King', symbol: 'DIV', annualReturn: 0.06, volatility: 0.10 },
    { category: 'stocks', name: 'S&P 500 ETF', symbol: 'SPY', annualReturn: 0.10, volatility: 0.15 },
    { category: 'stocks', name: 'Nasdaq 100 ETF', symbol: 'QQQ', annualReturn: 0.15, volatility: 0.22 },
    { category: 'crypto', name: 'Bitcoin', symbol: 'BTC', annualReturn: 0.60, volatility: 0.70 },
    { category: 'crypto', name: 'Ethereum', symbol: 'ETH', annualReturn: 0.50, volatility: 0.60 },
    { category: 'real_estate', name: 'Downtown Apartment', symbol: null, annualReturn: 0.04, volatility: 0.03 },
    { category: 'real_estate', name: 'Vacation Home', symbol: null, annualReturn: 0.03, volatility: 0.04 },
    { category: 'bonds', name: 'Treasury Bonds', symbol: null, annualReturn: 0.035, volatility: 0.02 },
    { category: 'cash', name: 'High Yield Savings', symbol: null, annualReturn: 0.025, volatility: 0.005 },
    { category: 'other', name: 'Gold Bullion', symbol: 'GOLD', annualReturn: 0.05, volatility: 0.15 }
];

function generateReviewDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

function generateHistory(startValue, startDate, annualReturn, volatility) {
    const history = [];
    let currentValue = startValue;
    const now = new Date();
    let currentDate = new Date(startDate);

    // Monthly steps
    while (currentDate <= now) {
        // Annual return converted to monthly
        const monthlyReturn = annualReturn / 12;
        // Monthly volatility = annual volatility / sqrt(12), simplified random walk
        const monthlyVol = volatility / Math.sqrt(12);

        // Random change: drift + shock
        const percentChange = monthlyReturn + (Math.random() * monthlyVol * 2 - monthlyVol); // simple random walk

        // Apply change
        currentValue = currentValue * (1 + percentChange);

        history.push({
            date: currentDate.toISOString().split('T')[0],
            value: Number(currentValue.toFixed(2))
        });

        currentDate = addMonths(currentDate, 1);
    }
    return history;
}

async function generateData() {
    console.log('Starting sample data generation...');

    try {
        // 1. Clean up existing test users if they exist
        console.log('Cleaning up old test data...');
        for (const u of USERS) {
            const row = await dbGet('SELECT id FROM persons WHERE name = ?', [u.name]);
            if (row) {
                // Delete assets for this user
                const assets = await new Promise((resolve, reject) => {
                    db.all('SELECT id FROM assets WHERE ownerId = ?', [row.id], (err, rows) => {
                        if (err) reject(err); else resolve(rows);
                    });
                });
                for (const asset of assets) {
                    await dbRun('DELETE FROM asset_history WHERE assetId = ?', [asset.id]);
                }
                await dbRun('DELETE FROM assets WHERE ownerId = ?', [row.id]);
                await dbRun('DELETE FROM persons WHERE id = ?', [row.id]);
            }
        }

        // 2. Create Users
        console.log('Creating users...');
        const userIds = {};
        for (const u of USERS) {
            const id = uuidv4();
            await dbRun('INSERT INTO persons (id, name, displayOrder) VALUES (?, ?, ?)', [id, u.name, 10]);
            userIds[u.name] = id;
            console.log(`Created user: ${u.name}`);
        }

        // 3. Create Assets and History
        console.log('Generating assets and history...');
        const NOW = new Date();
        const START_DATE_LIMIT = new Date(NOW);
        START_DATE_LIMIT.setFullYear(NOW.getFullYear() - 15);
        const SIX_MONTHS_AGO = new Date(NOW);
        SIX_MONTHS_AGO.setMonth(NOW.getMonth() - 6);

        // Calculate assets per user to distribute 12 assets evenly
        const assetsPerUser = Math.floor(ASSET_TEMPLATES.length / USERS.length);
        let templateIndex = 0;

        await dbRun('BEGIN TRANSACTION');

        for (const u of USERS) {
            const userId = userIds[u.name];

            // Assign next batch of assets to this user
            const userTemplates = ASSET_TEMPLATES.slice(templateIndex, templateIndex + assetsPerUser);
            templateIndex += assetsPerUser;

            for (const item of userTemplates) {
                // Randomize Purchase Date: between 15 years ago and 6 months ago
                const purchaseDate = generateReviewDate(START_DATE_LIMIT, SIX_MONTHS_AGO);

                // Randomize Initial Investment: 1k to 50k
                const purchaseAmount = Math.floor(Math.random() * 49000) + 1000;

                // Generate History
                const history = generateHistory(purchaseAmount, purchaseDate, item.annualReturn, item.volatility);
                const currentValue = history.length > 0 ? history[history.length - 1].value : purchaseAmount;

                const assetId = uuidv4();

                // Insert Asset
                await dbRun(
                    `INSERT INTO assets (id, name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        assetId,
                        item.name,
                        item.category,
                        userId,
                        purchaseAmount,
                        purchaseDate.toISOString().split('T')[0],
                        currentValue,
                        item.symbol
                    ]
                );

                // Insert History
                const stmt = db.prepare('INSERT INTO asset_history (assetId, date, value, investmentChange) VALUES (?, ?, ?, ?)');
                history.forEach((h, index) => {
                    const change = index === 0 ? purchaseAmount : 0;
                    stmt.run(assetId, h.date, h.value, change);
                });
                stmt.finalize();

                console.log(`Created asset: ${item.name} for ${u.name} with ${history.length} history points.`);
            }
        }

        await dbRun('COMMIT');

        console.log('Sample data generation complete!');

    } catch (err) {
        console.error('Error generating data:', err);
    } finally {
        db.close(); // Close connection
    }
}

generateData();
