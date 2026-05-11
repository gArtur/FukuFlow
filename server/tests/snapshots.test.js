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

        const assetRes = await request(app)
            .post('/api/assets')
            .set(authHeader(token))
            .send({
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
                .send({ date: latest.date, value: 9999, investmentChange: latest.investmentChange || 0, notes: '' });
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
                .send({ date: firstSnapshot.date, value: firstSnapshot.value, investmentChange: oldIC + 1000, notes: '' });

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
});
