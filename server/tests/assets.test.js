const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const { createTestApp, setupAndLogin, authHeader } = require('./helpers');

describe('Assets routes', () => {
    let app, db, token, personId;

    beforeAll(async () => {
        ({ app, db } = await createTestApp());
        token = await setupAndLogin(app);

        // Create a person to own assets
        const res = await request(app)
            .post('/api/persons')
            .set(authHeader(token))
            .send({ name: 'Alice' });
        personId = res.body.id;
    });

    function validAsset(overrides = {}) {
        return {
            name: 'Test ETF',
            category: 'etf',
            ownerId: personId,
            purchaseAmount: 1000,
            purchaseDate: '2024-01-01',
            currentValue: 1100,
            ...overrides,
        };
    }

    describe('GET /api/assets', () => {
        it('returns an array with valueHistory arrays', async () => {
            const res = await request(app).get('/api/assets').set(authHeader(token));
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            if (res.body.length > 0) {
                expect(Array.isArray(res.body[0].valueHistory)).toBe(true);
            }
        });
    });

    describe('POST /api/assets', () => {
        it('creates an asset and returns it with an empty valueHistory', async () => {
            const res = await request(app)
                .post('/api/assets')
                .set(authHeader(token))
                .send(validAsset());
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Test ETF');
            expect(res.body.valueHistory).toEqual([]);
        });

        it('rejects missing name with 400', async () => {
            const res = await request(app)
                .post('/api/assets')
                .set(authHeader(token))
                .send(validAsset({ name: undefined }));
            expect(res.status).toBe(400);
        });

        it('rejects missing ownerId with 400', async () => {
            const res = await request(app)
                .post('/api/assets')
                .set(authHeader(token))
                .send(validAsset({ ownerId: undefined }));
            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/assets/:id', () => {
        let assetId;

        beforeAll(async () => {
            const res = await request(app)
                .post('/api/assets')
                .set(authHeader(token))
                .send(validAsset({ name: 'Update Target' }));
            assetId = res.body.id;
        });

        it('updates allowed fields', async () => {
            const res = await request(app)
                .put(`/api/assets/${assetId}`)
                .set(authHeader(token))
                .send({ name: 'Renamed ETF', symbol: 'QQQ' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Renamed ETF');
            expect(res.body.symbol).toBe('QQQ');
        });

        it('silently ignores disallowed fields (whitelist enforcement)', async () => {
            const res = await request(app)
                .put(`/api/assets/${assetId}`)
                .set(authHeader(token))
                .send({ name: 'Still Renamed', currentValue: 99999 });
            expect(res.status).toBe(200);
            // currentValue should not appear in response (was stripped)
            expect(res.body.currentValue).toBeUndefined();
        });

        it('returns 200 with message when only disallowed fields are provided', async () => {
            const res = await request(app)
                .put(`/api/assets/${assetId}`)
                .set(authHeader(token))
                .send({ currentValue: 99999, purchaseAmount: 1 });
            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/no valid fields/i);
        });

        it('returns 400 for invalid UUID in :id param', async () => {
            const res = await request(app)
                .put('/api/assets/not-a-uuid')
                .set(authHeader(token))
                .send({ name: 'Nope' });
            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /api/assets/:id', () => {
        it('returns 400 for invalid UUID in :id param', async () => {
            const res = await request(app)
                .delete('/api/assets/not-a-uuid')
                .set(authHeader(token));
            expect(res.status).toBe(400);
        });

        it('removes the asset from GET response', async () => {
            const createRes = await request(app)
                .post('/api/assets')
                .set(authHeader(token))
                .send(validAsset({ name: 'To Delete' }));
            const assetId = createRes.body.id;

            const delRes = await request(app)
                .delete(`/api/assets/${assetId}`)
                .set(authHeader(token));
            expect(delRes.status).toBe(204);

            const listRes = await request(app).get('/api/assets').set(authHeader(token));
            expect(listRes.body.find(a => a.id === assetId)).toBeUndefined();
        });

        it('cascades deletion to asset_history', async () => {
            const createRes = await request(app)
                .post('/api/assets')
                .set(authHeader(token))
                .send(validAsset({ name: 'Cascade Test' }));
            const assetId = createRes.body.id;

            await request(app)
                .post(`/api/assets/${assetId}/snapshot`)
                .set(authHeader(token))
                .send({ value: 5000, date: '2024-06-01' });

            await request(app).delete(`/api/assets/${assetId}`).set(authHeader(token));

            const historyCount = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM asset_history WHERE assetId = ?', [assetId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });
            expect(historyCount).toBe(0);
        });
    });

    describe('POST /api/assets/:id/snapshot', () => {
        it('adds a snapshot and updates currentValue on the asset', async () => {
            const createRes = await request(app)
                .post('/api/assets')
                .set(authHeader(token))
                .send(validAsset({ name: 'Snapshot Asset', currentValue: 1000 }));
            const assetId = createRes.body.id;

            const snapRes = await request(app)
                .post(`/api/assets/${assetId}/snapshot`)
                .set(authHeader(token))
                .send({ value: 2500, date: '2024-07-01' });
            expect(snapRes.status).toBe(200);

            const listRes = await request(app).get('/api/assets').set(authHeader(token));
            const asset = listRes.body.find(a => a.id === assetId);
            expect(asset.currentValue).toBe(2500);
        });

        it('returns 404 for non-existent assetId', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .post(`/api/assets/${fakeId}/snapshot`)
                .set(authHeader(token))
                .send({ value: 100, date: '2024-01-01' });
            expect(res.status).toBe(404);
        });

        it('returns 400 when value field is missing', async () => {
            const createRes = await request(app)
                .post('/api/assets')
                .set(authHeader(token))
                .send(validAsset({ name: 'Missing Value Asset' }));
            const assetId = createRes.body.id;

            const res = await request(app)
                .post(`/api/assets/${assetId}/snapshot`)
                .set(authHeader(token))
                .send({ date: '2024-01-01' });
            expect(res.status).toBe(400);
        });

        it('returns 400 for invalid date format', async () => {
            const createRes = await request(app)
                .post('/api/assets')
                .set(authHeader(token))
                .send(validAsset({ name: 'Bad Date Asset' }));
            const assetId = createRes.body.id;

            const res = await request(app)
                .post(`/api/assets/${assetId}/snapshot`)
                .set(authHeader(token))
                .send({ value: 100, date: 'not-a-date' });
            expect(res.status).toBe(400);
        });

        it('keeps Invested Capital intact for a value-only snapshot (reconcile invariant)', async () => {
            const createRes = await request(app)
                .post('/api/assets')
                .set(authHeader(token))
                .send(validAsset({ name: 'Value-Only Snapshot Asset', currentValue: 0 }));
            const assetId = createRes.body.id;

            // Snapshot with an investment change establishes a known Invested Capital baseline.
            await request(app)
                .post(`/api/assets/${assetId}/snapshot`)
                .set(authHeader(token))
                .send({ value: 1200, investmentChange: 1000, date: '2024-07-01' });

            // Value-only snapshot (no investmentChange) updates Total Worth only.
            await request(app)
                .post(`/api/assets/${assetId}/snapshot`)
                .set(authHeader(token))
                .send({ value: 1500, date: '2024-08-01' });

            const listRes = await request(app).get('/api/assets').set(authHeader(token));
            const asset = listRes.body.find(a => a.id === assetId);
            // currentValue follows the latest snapshot...
            expect(asset.currentValue).toBe(1500);
            // ...while purchaseAmount stays = SUM(investmentChange), undisturbed by the value-only snapshot.
            expect(asset.purchaseAmount).toBe(1000);
        });
    });
});
