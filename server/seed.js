const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.resolve(__dirname, 'db', 'wealth.db');
const db = new sqlite3.Database(dbPath);

const persons = [
    { name: 'Artur', id: '2ddf08f9-f0c7-47e6-a456-292ff498700b' },
    { name: 'Kinga', id: '6fa72698-2b5e-4fda-a78c-54f31fa7b30c' },
    { name: 'Zosia', id: '55fde2e9-332e-49c3-bd16-02967ba82977' }
];

const getOwnerId = (role) => {
    if (role === 'self') return persons[0].id;
    if (role === 'wife') return persons[1].id;
    if (role === 'daughter') return persons[2].id;
    return persons[0].id;
};

const SAMPLE_ASSETS = [
    {
        name: 'Amundi MSCI World ETF',
        category: 'etf',
        role: 'self',
        purchaseDate: '2023-01-15',
        purchaseAmount: 50000,
        currentValue: 62230,
        symbol: 'IWDA.AS',
        history: [
            { date: '2023-01-15', value: 50000 },
            { date: '2023-03-01', value: 51200 },
            { date: '2023-06-01', value: 54500 },
            { date: '2023-09-01', value: 52800 },
            { date: '2023-12-01', value: 56400 },
            { date: '2024-03-01', value: 58900 },
            { date: '2024-06-01', value: 57200 },
            { date: '2024-09-01', value: 60100 },
            { date: '2024-12-01', value: 62230 }
        ]
    },
    {
        name: 'Bitcoin',
        category: 'crypto',
        role: 'self',
        purchaseDate: '2022-06-20',
        purchaseAmount: 15000,
        currentValue: 18230,
        symbol: 'BTC',
        history: [
            { date: '2022-06-20', value: 15000 },
            { date: '2022-09-01', value: 12500 },
            { date: '2022-12-01', value: 10800 },
            { date: '2023-03-01', value: 14200 },
            { date: '2023-06-01', value: 16500 },
            { date: '2023-09-01', value: 15800 },
            { date: '2023-12-01', value: 19200 },
            { date: '2024-06-01', value: 17500 },
            { date: '2024-12-01', value: 18230 }
        ]
    },
    {
        name: 'Apartment Krakow',
        category: 'real_estate',
        role: 'self',
        purchaseDate: '2020-03-10',
        purchaseAmount: 450000,
        currentValue: 535800,
        history: [
            { date: '2020-03-10', value: 450000 },
            { date: '2021-01-01', value: 465000 },
            { date: '2022-01-01', value: 495000 },
            { date: '2023-01-01', value: 520000 },
            { date: '2024-01-01', value: 530000 },
            { date: '2024-12-01', value: 535800 }
        ]
    },
    {
        name: 'Apple Inc.',
        category: 'stocks',
        role: 'wife',
        purchaseDate: '2023-05-12',
        purchaseAmount: 8000,
        currentValue: 10530,
        symbol: 'AAPL',
        history: [
            { date: '2023-05-12', value: 8000 },
            { date: '2023-08-01', value: 8800 },
            { date: '2023-11-01', value: 9200 },
            { date: '2024-02-01', value: 9800 },
            { date: '2024-05-01', value: 10100 },
            { date: '2024-08-01', value: 9900 },
            { date: '2024-12-01', value: 10530 }
        ]
    },
    {
        name: 'Emergency Fund',
        category: 'cash',
        role: 'self',
        purchaseDate: '2021-01-01',
        purchaseAmount: 25000,
        currentValue: 25000,
        history: [
            { date: '2021-01-01', value: 20000 },
            { date: '2022-01-01', value: 22000 },
            { date: '2023-01-01', value: 24000 },
            { date: '2024-01-01', value: 25000 },
            { date: '2024-12-01', value: 25000 }
        ]
    },
    {
        name: 'Treasury Bonds',
        category: 'bonds',
        role: 'wife',
        purchaseDate: '2022-09-01',
        purchaseAmount: 30000,
        currentValue: 33450,
        history: [
            { date: '2022-09-01', value: 30000 },
            { date: '2023-03-01', value: 30900 },
            { date: '2023-09-01', value: 31800 },
            { date: '2024-03-01', value: 32700 },
            { date: '2024-09-01', value: 33200 },
            { date: '2024-12-01', value: 33450 }
        ]
    },
    {
        name: 'Education Savings',
        category: 'cash',
        role: 'daughter',
        purchaseDate: '2019-06-15',
        purchaseAmount: 5000,
        currentValue: 12500,
        history: [
            { date: '2019-06-15', value: 5000 },
            { date: '2020-06-01', value: 6500 },
            { date: '2021-06-01', value: 8000 },
            { date: '2022-06-01', value: 9500 },
            { date: '2023-06-01', value: 11000 },
            { date: '2024-06-01', value: 12000 },
            { date: '2024-12-01', value: 12500 }
        ]
    },
    {
        name: 'Ethereum',
        category: 'crypto',
        role: 'daughter',
        purchaseDate: '2023-12-01',
        purchaseAmount: 2000,
        currentValue: 2580,
        symbol: 'ETH',
        history: [
            { date: '2023-12-01', value: 2000 },
            { date: '2024-03-01', value: 2800 },
            { date: '2024-06-01', value: 2400 },
            { date: '2024-09-01', value: 2200 },
            { date: '2024-12-01', value: 2580 }
        ]
    }
];

db.serialize(() => {
    SAMPLE_ASSETS.forEach(asset => {
        const id = uuidv4();
        const ownerId = getOwnerId(asset.role);

        db.run(`INSERT INTO assets (id, name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, asset.name, asset.category, ownerId, asset.purchaseAmount, asset.purchaseDate, asset.currentValue, asset.symbol || null],
            (err) => {
                if (err) console.error('Error inserting asset:', err.message);
            }
        );

        asset.history.forEach(entry => {
            db.run('INSERT INTO asset_history (assetId, date, value) VALUES (?, ?, ?)',
                [id, new Date(entry.date).toISOString(), entry.value],
                (err) => {
                    if (err) console.error('Error inserting history:', err.message);
                }
            );
        });
    });
});

db.close((err) => {
    if (err) console.error(err.message);
    console.log('Seeding completed.');
});
