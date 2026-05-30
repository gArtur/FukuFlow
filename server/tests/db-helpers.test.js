const sqlite3 = require('sqlite3').verbose();
const { initSchema } = require('../db');
const { promisifyDb, reconcileAsset, withTransaction } = require('../db-helpers');

describe('withTransaction', () => {
    let db, adb;

    beforeEach(async () => {
        db = new sqlite3.Database(':memory:');
        await initSchema(db);
        adb = promisifyDb(db);
    });

    it('commits every write when fn resolves', async () => {
        await withTransaction(adb, async () => {
            await adb.run('INSERT INTO persons (id, name) VALUES (?, ?)', ['p1', 'A']);
            await adb.run('INSERT INTO persons (id, name) VALUES (?, ?)', ['p2', 'B']);
        });

        const rows = await adb.all('SELECT id FROM persons ORDER BY id');
        expect(rows.map(r => r.id)).toEqual(['p1', 'p2']);
    });

    it('rolls back every write and rethrows when fn throws', async () => {
        await expect(
            withTransaction(adb, async () => {
                await adb.run('INSERT INTO persons (id, name) VALUES (?, ?)', ['p1', 'A']);
                throw new Error('boom');
            })
        ).rejects.toThrow('boom');

        const rows = await adb.all('SELECT id FROM persons');
        expect(rows).toEqual([]);
    });

    it('rolls back when a statement fails (PK violation) and rethrows', async () => {
        await adb.run('INSERT INTO persons (id, name) VALUES (?, ?)', ['dup', 'Existing']);

        await expect(
            withTransaction(adb, async () => {
                await adb.run('INSERT INTO persons (id, name) VALUES (?, ?)', ['ok', 'New']);
                // Duplicate primary key → the run rejects, failing the transaction.
                await adb.run('INSERT INTO persons (id, name) VALUES (?, ?)', ['dup', 'Conflict']);
            })
        ).rejects.toBeTruthy();

        // The 'ok' insert must not persist; only the pre-existing row remains.
        const rows = await adb.all('SELECT id FROM persons ORDER BY id');
        expect(rows.map(r => r.id)).toEqual(['dup']);
    });
});

describe('reconcileAsset', () => {
    let db, adb;

    beforeEach(async () => {
        db = new sqlite3.Database(':memory:');
        await initSchema(db);
        adb = promisifyDb(db);

        await adb.run('INSERT INTO persons (id, name) VALUES (?, ?)', ['p1', 'Owner']);
        // Asset created with deliberately drifted derived columns.
        await adb.run(
            `INSERT INTO assets (id, name, category, ownerId, purchaseAmount, purchaseDate, currentValue)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['a1', 'Drifted', 'stocks', 'p1', 9999, '2024-01-01', 9999]
        );
    });

    async function getAsset() {
        return adb.get('SELECT currentValue, purchaseAmount FROM assets WHERE id = ?', ['a1']);
    }

    it('re-derives currentValue from the latest snapshot and purchaseAmount from SUM(investmentChange)', async () => {
        await adb.run(
            'INSERT INTO asset_history (assetId, date, value, investmentChange) VALUES (?, ?, ?, ?)',
            ['a1', '2024-02-01', 100, 100]
        );
        await adb.run(
            'INSERT INTO asset_history (assetId, date, value, investmentChange) VALUES (?, ?, ?, ?)',
            ['a1', '2024-03-01', 250, 50]
        );

        await reconcileAsset(adb, 'a1');

        const asset = await getAsset();
        expect(asset.currentValue).toBe(250);
        expect(asset.purchaseAmount).toBe(150);
    });

    it('breaks ties on the same date by highest id (latest insert wins)', async () => {
        await adb.run(
            'INSERT INTO asset_history (assetId, date, value, investmentChange) VALUES (?, ?, ?, ?)',
            ['a1', '2024-05-01', 100, 0]
        );
        await adb.run(
            'INSERT INTO asset_history (assetId, date, value, investmentChange) VALUES (?, ?, ?, ?)',
            ['a1', '2024-05-01', 200, 0]
        );

        await reconcileAsset(adb, 'a1');

        const asset = await getAsset();
        expect(asset.currentValue).toBe(200);
    });

    it('zeroes purchaseAmount and leaves currentValue when no snapshots remain', async () => {
        await reconcileAsset(adb, 'a1');

        const asset = await getAsset();
        expect(asset.purchaseAmount).toBe(0);
        expect(asset.currentValue).toBe(9999);
    });
});
