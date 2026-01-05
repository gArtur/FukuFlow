const { db } = require('../server/db');

// Promisify db functions
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

const USERS_TO_REMOVE = ['Alice', 'Bob', 'Charlie'];

async function clearData() {
    console.log('Starting sample data cleanup...');

    try {
        for (const name of USERS_TO_REMOVE) {
            const row = await dbGet('SELECT id FROM persons WHERE name = ?', [name]);
            if (row) {
                console.log(`Removing user: ${name}...`);
                // Get assets for this user
                const assets = await new Promise((resolve, reject) => {
                    db.all('SELECT id FROM assets WHERE ownerId = ?', [row.id], (err, rows) => {
                        if (err) reject(err); else resolve(rows);
                    });
                });

                // Delete history for each asset
                for (const asset of assets) {
                    await dbRun('DELETE FROM asset_history WHERE assetId = ?', [asset.id]);
                }

                // Delete assets
                await dbRun('DELETE FROM assets WHERE ownerId = ?', [row.id]);

                // Delete person
                await dbRun('DELETE FROM persons WHERE id = ?', [row.id]);
                console.log(`Removed ${name} and all associated data.`);
            } else {
                console.log(`User ${name} not found, skipping.`);
            }
        }

        console.log('Cleanup complete!');

    } catch (err) {
        if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
            console.log('⚠️  Database tables not found. The database appears to be empty or uninitialized.');
            console.log('   Nothing to clear.');
        } else {
            console.error('Error clearing data:', err);
        }
    } finally {
        db.close();
    }
}

clearData();
