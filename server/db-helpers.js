/**
 * Promisified SQLite helpers and the single asset-reconciliation operation.
 *
 * Snapshot reconciliation invariant: an asset's derived columns are ALWAYS
 * re-derived from `asset_history`, never nudged incrementally.
 *   - `currentValue`   = the latest snapshot's value (by `date DESC, id DESC`)
 *                        — the asset's latest Total Worth.
 *   - `purchaseAmount` = `SUM(investmentChange)` over all snapshots
 *                        — the asset's Invested Capital.
 * (The columns are named `currentValue`/`purchaseAmount` for historical
 * reasons; renaming them is out of scope. See CONTEXT.md for the vocabulary.)
 *
 * Every snapshot mutation must call `reconcileAsset` after changing history,
 * inside a transaction (see `withTransaction`).
 */

/**
 * Wrap a sqlite3 Database in promise-returning `run`/`get`/`all` methods so
 * callers can read linearly with async/await. `run` resolves to the underlying
 * statement (`this`) so `lastID`/`changes` stay available.
 * @param {import('sqlite3').Database} database
 */
function promisifyDb(database) {
    return {
        run(sql, params = []) {
            return new Promise((resolve, reject) => {
                database.run(sql, params, function (err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
        },
        get(sql, params = []) {
            return new Promise((resolve, reject) => {
                database.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
            });
        },
        all(sql, params = []) {
            return new Promise((resolve, reject) => {
                database.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
            });
        },
    };
}

/**
 * Run `fn` inside a BEGIN/COMMIT transaction, rolling back on any error.
 * @param {ReturnType<typeof promisifyDb>} adb
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
async function withTransaction(adb, fn) {
    await adb.run('BEGIN');
    try {
        const result = await fn();
        await adb.run('COMMIT');
        return result;
    } catch (err) {
        await adb.run('ROLLBACK');
        throw err;
    }
}

/**
 * Re-derive an asset's `currentValue` and `purchaseAmount` from its snapshot
 * history. This is the per-asset form of the startup `syncAssets` derivation.
 * @param {ReturnType<typeof promisifyDb>} adb
 * @param {string} assetId
 */
async function reconcileAsset(adb, assetId) {
    const derived = await adb.get(
        `SELECT
            (SELECT value FROM asset_history
                WHERE assetId = ? ORDER BY date DESC, id DESC LIMIT 1) AS latestValue,
            (SELECT COALESCE(SUM(investmentChange), 0) FROM asset_history
                WHERE assetId = ?) AS investedCapital`,
        [assetId, assetId]
    );

    // No snapshots remain: re-derive Invested Capital (0) but leave the last
    // known Total Worth untouched, mirroring syncAssets.
    if (derived.latestValue === null) {
        await adb.run('UPDATE assets SET purchaseAmount = ? WHERE id = ?', [
            derived.investedCapital,
            assetId,
        ]);
        return;
    }

    await adb.run('UPDATE assets SET currentValue = ?, purchaseAmount = ? WHERE id = ?', [
        derived.latestValue,
        derived.investedCapital,
        assetId,
    ]);
}

module.exports = { promisifyDb, withTransaction, reconcileAsset };
