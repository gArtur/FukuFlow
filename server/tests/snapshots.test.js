const request = require('supertest');
const { createTestApp, setupAndLogin, authHeader } = require('./helpers');

describe('Snapshots routes', () => {
    let app, db, token, assetId;

    beforeAll(async () => {
        ({ app, db } = await createTestApp());
        token = await setupAndLogin(app);

        const personRes = await request(app)
            .post('/api/persons')
            .set(authHeader(token))
            .send({ name: 'Bob' });
        const personId = personRes.body.id;

        const assetRes = await request(app).post('/api/assets').set(authHeader(token)).send({
            name: 'Snapshot Test Asset',
            category: 'stocks',
            ownerId: personId,
            purchaseAmount: 0,
            purchaseDate: '2024-01-01',
            currentValue: 0,
        });
        assetId = assetRes.body.id;
    });

    async function addSnapshot(value, date, investmentChange = 0, notes = '') {
        return request(app)
            .post(`/api/assets/${assetId}/snapshot`)
            .set(authHeader(token))
            .send({ value, date, investmentChange, notes });
    }

    async function getAsset() {
        const res = await request(app).get('/api/assets').set(authHeader(token));
        return res.body.find(a => a.id === assetId);
    }

    it('investmentChange is reflected in the asset purchaseAmount', async () => {
        await addSnapshot(5000, '2024-02-01', 5000);
        const asset = await getAsset();
        expect(asset.purchaseAmount).toBe(5000);
    });

    it('notes field round-trips correctly', async () => {
        await addSnapshot(5500, '2024-03-01', 0, 'Monthly check');
        const asset = await getAsset();
        const entry = asset.valueHistory.find(h => h.notes === 'Monthly check');
        expect(entry).toBeDefined();
        expect(entry.notes).toBe('Monthly check');
    });

    it('two snapshots on the same date are both stored', async () => {
        await addSnapshot(6000, '2024-04-01');
        await addSnapshot(6100, '2024-04-01');
        const asset = await getAsset();
        const aprilEntries = asset.valueHistory.filter(h => h.date.startsWith('2024-04-01'));
        expect(aprilEntries.length).toBe(2);
    });

    describe('PUT /api/snapshots/:id', () => {
        it('updates value and recalculates asset currentValue when it is the latest snapshot', async () => {
            const asset = await getAsset();
            const latest = asset.valueHistory[asset.valueHistory.length - 1];

            const res = await request(app)
                .put(`/api/snapshots/${latest.id}`)
                .set(authHeader(token))
                .send({
                    date: latest.date,
                    value: 9999,
                    investmentChange: latest.investmentChange || 0,
                    notes: '',
                });
            expect(res.status).toBe(200);

            const updated = await getAsset();
            expect(updated.currentValue).toBe(9999);
        });

        it('updates investmentChange and adjusts asset purchaseAmount correctly', async () => {
            const asset = await getAsset();
            const firstSnapshot = asset.valueHistory[0];
            const originalPurchaseAmount = asset.purchaseAmount;
            const oldIC = firstSnapshot.investmentChange || 0;

            await request(app)
                .put(`/api/snapshots/${firstSnapshot.id}`)
                .set(authHeader(token))
                .send({
                    date: firstSnapshot.date,
                    value: firstSnapshot.value,
                    investmentChange: oldIC + 1000,
                    notes: '',
                });

            const updated = await getAsset();
            expect(updated.purchaseAmount).toBe(originalPurchaseAmount + 1000);
        });
    });

    describe('DELETE /api/snapshots/:id', () => {
        it('removes the snapshot row', async () => {
            const snap = await addSnapshot(7777, '2025-01-01', 500);
            const asset = await getAsset();
            const entry = asset.valueHistory.find(h => h.value === 7777);

            await request(app).delete(`/api/snapshots/${entry.id}`).set(authHeader(token));

            const updated = await getAsset();
            expect(updated.valueHistory.find(h => h.id === entry.id)).toBeUndefined();
        });

        it('reverses the investmentChange on delete', async () => {
            const assetBefore = await getAsset();
            const purchaseBefore = assetBefore.purchaseAmount;

            await addSnapshot(8000, '2025-02-01', 2000);
            const assetAfterAdd = await getAsset();
            const newEntry = assetAfterAdd.valueHistory.find(h => h.value === 8000);

            await request(app).delete(`/api/snapshots/${newEntry.id}`).set(authHeader(token));

            const assetAfterDelete = await getAsset();
            expect(assetAfterDelete.purchaseAmount).toBe(purchaseBefore);
        });

        it('returns 404 for non-existent snapshot', async () => {
            const res = await request(app).delete('/api/snapshots/999999').set(authHeader(token));
            expect(res.status).toBe(404);
        });
    });

    describe('reconciliation invariant', () => {
        let invariantAssetId;

        async function freshAsset() {
            const personRes = await request(app)
                .post('/api/persons')
                .set(authHeader(token))
                .send({ name: 'Reconcile Owner' });
            const assetRes = await request(app).post('/api/assets').set(authHeader(token)).send({
                name: 'Reconcile Asset',
                category: 'stocks',
                ownerId: personRes.body.id,
                purchaseAmount: 0,
                purchaseDate: '2024-01-01',
                currentValue: 0,
            });
            return assetRes.body.id;
        }

        async function snap(id, value, date, investmentChange = 0) {
            return request(app)
                .post(`/api/assets/${id}/snapshot`)
                .set(authHeader(token))
                .send({ value, date, investmentChange });
        }

        async function fetchAsset(id) {
            const res = await request(app).get('/api/assets').set(authHeader(token));
            return res.body.find(a => a.id === id);
        }

        beforeEach(async () => {
            invariantAssetId = await freshAsset();
        });

        it('editing a snapshot date so it is no longer the latest moves currentValue to the new latest', async () => {
            await snap(invariantAssetId, 100, '2024-02-01');
            await snap(invariantAssetId, 200, '2024-03-01'); // latest -> currentValue 200

            const asset = await fetchAsset(invariantAssetId);
            const marchSnap = asset.valueHistory.find(h => h.value === 200);

            // Re-date the latest snapshot into the past; the 100 snapshot becomes latest.
            await request(app)
                .put(`/api/snapshots/${marchSnap.id}`)
                .set(authHeader(token))
                .send({ date: '2024-01-15', value: 200, investmentChange: 0, notes: '' });

            const updated = await fetchAsset(invariantAssetId);
            expect(updated.currentValue).toBe(100);
        });

        it('deleting a NON-latest snapshot leaves currentValue at the latest', async () => {
            await snap(invariantAssetId, 100, '2024-02-01');
            await snap(invariantAssetId, 200, '2024-03-01'); // latest

            const asset = await fetchAsset(invariantAssetId);
            const febSnap = asset.valueHistory.find(h => h.value === 100);

            await request(app).delete(`/api/snapshots/${febSnap.id}`).set(authHeader(token));

            const updated = await fetchAsset(invariantAssetId);
            expect(updated.currentValue).toBe(200);
        });

        it('deleting the latest snapshot falls currentValue back to the previous snapshot', async () => {
            await snap(invariantAssetId, 100, '2024-02-01');
            await snap(invariantAssetId, 200, '2024-03-01'); // latest

            const asset = await fetchAsset(invariantAssetId);
            const marchSnap = asset.valueHistory.find(h => h.value === 200);

            await request(app).delete(`/api/snapshots/${marchSnap.id}`).set(authHeader(token));

            const updated = await fetchAsset(invariantAssetId);
            expect(updated.currentValue).toBe(100);
        });

        it('purchaseAmount stays equal to SUM(investmentChange) across add/update/delete', async () => {
            await snap(invariantAssetId, 1000, '2024-02-01', 1000);
            await snap(invariantAssetId, 1500, '2024-03-01', 400);
            await snap(invariantAssetId, 1800, '2024-04-01', 300);

            let asset = await fetchAsset(invariantAssetId);
            expect(asset.purchaseAmount).toBe(1700); // 1000 + 400 + 300

            // Edit a non-latest snapshot's investmentChange.
            const marchSnap = asset.valueHistory.find(h => h.value === 1500);
            await request(app)
                .put(`/api/snapshots/${marchSnap.id}`)
                .set(authHeader(token))
                .send({ date: '2024-03-01', value: 1500, investmentChange: 900, notes: '' });

            asset = await fetchAsset(invariantAssetId);
            expect(asset.purchaseAmount).toBe(2200); // 1000 + 900 + 300
            expect(asset.currentValue).toBe(1800); // latest unchanged

            // Delete a snapshot and confirm the sum follows.
            const aprilSnap = asset.valueHistory.find(h => h.value === 1800);
            await request(app).delete(`/api/snapshots/${aprilSnap.id}`).set(authHeader(token));

            asset = await fetchAsset(invariantAssetId);
            expect(asset.purchaseAmount).toBe(1900); // 1000 + 900
            expect(asset.currentValue).toBe(1500); // new latest
        });
    });

    describe('POST /api/assets/:id/snapshot/bulk', () => {
        let bulkAssetId;

        async function freshBulkAsset() {
            const personRes = await request(app)
                .post('/api/persons')
                .set(authHeader(token))
                .send({ name: 'Bulk Owner' });
            const assetRes = await request(app).post('/api/assets').set(authHeader(token)).send({
                name: 'Bulk Asset',
                category: 'stocks',
                ownerId: personRes.body.id,
                purchaseAmount: 0,
                purchaseDate: '2024-01-01',
                currentValue: 0,
            });
            return assetRes.body.id;
        }

        async function fetchAsset(id) {
            const res = await request(app).get('/api/assets').set(authHeader(token));
            return res.body.find(a => a.id === id);
        }

        beforeEach(async () => {
            bulkAssetId = await freshBulkAsset();
        });

        it('inserts all rows in one import and reconciles the asset once', async () => {
            const res = await request(app)
                .post(`/api/assets/${bulkAssetId}/snapshot/bulk`)
                .set(authHeader(token))
                .send({
                    snapshots: [
                        { date: '2024-02-01', value: 1000, investmentChange: 1000, notes: 'a' },
                        { date: '2024-03-01', value: 1500, investmentChange: 400, notes: 'b' },
                        { date: '2024-04-01', value: 1800, investmentChange: 300, notes: 'c' },
                    ],
                });

            expect(res.status).toBe(200);
            expect(res.body.inserted).toBe(3);

            const asset = await fetchAsset(bulkAssetId);
            expect(asset.valueHistory.length).toBe(3);
            // reconcileAsset ran: currentValue = latest, purchaseAmount = SUM(investmentChange)
            expect(asset.currentValue).toBe(1800);
            expect(asset.purchaseAmount).toBe(1700);
        });

        it('rolls back the entire import when any row is invalid and returns 400 with per-row detail', async () => {
            const res = await request(app)
                .post(`/api/assets/${bulkAssetId}/snapshot/bulk`)
                .set(authHeader(token))
                .send({
                    snapshots: [
                        { date: '2024-02-01', value: 1000, investmentChange: 1000 },
                        { date: 'not-a-date', value: 1500, investmentChange: 400 },
                    ],
                });

            expect(res.status).toBe(400);
            // error detail references the offending row by index
            expect(res.body.error).toMatch(/snapshots\[1\]/);

            // No partial state: nothing was inserted, asset stays untouched.
            const asset = await fetchAsset(bulkAssetId);
            expect(asset.valueHistory.length).toBe(0);
            expect(asset.currentValue).toBe(0);
            expect(asset.purchaseAmount).toBe(0);
        });

        it('returns 404 for a non-existent asset', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .post(`/api/assets/${fakeId}/snapshot/bulk`)
                .set(authHeader(token))
                .send({ snapshots: [{ date: '2024-02-01', value: 100, investmentChange: 0 }] });
            expect(res.status).toBe(404);
        });
    });
});
