const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const { createTestApp, setupAndLogin, authHeader } = require('./helpers');

describe('Backup routes', () => {
    let app, token, personId, categoryId, assetId;

    beforeAll(async () => {
        ({ app } = await createTestApp());
        token = await setupAndLogin(app);

        const personRes = await request(app)
            .post('/api/persons')
            .set(authHeader(token))
            .send({ name: 'Backup Person' });
        personId = personRes.body.id;

        const catRes = await request(app)
            .post('/api/categories')
            .set(authHeader(token))
            .send({ label: 'Stocks', color: '#123456' });
        categoryId = catRes.body.id;

        const assetRes = await request(app)
            .post('/api/assets')
            .set(authHeader(token))
            .send({
                name: 'Backup Asset',
                category: catRes.body.key,
                ownerId: personId,
                purchaseAmount: 5000,
                purchaseDate: '2024-01-01',
                currentValue: 5500,
            });
        assetId = assetRes.body.id;

        await request(app)
            .post(`/api/assets/${assetId}/snapshot`)
            .set(authHeader(token))
            .send({ value: 5500, date: '2024-06-01' });
    });

    describe('GET /api/backup', () => {
        it('requires authentication', async () => {
            const res = await request(app).get('/api/backup');
            expect(res.status).toBe(401);
        });

        it('returns 200 with the expected top-level shape', async () => {
            const res = await request(app).get('/api/backup').set(authHeader(token));
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.persons)).toBe(true);
            expect(Array.isArray(res.body.assets)).toBe(true);
            expect(Array.isArray(res.body.history)).toBe(true);
            expect(Array.isArray(res.body.categories)).toBe(true);
            expect(Array.isArray(res.body.settings)).toBe(true);
        });

        it('backup includes previously inserted data', async () => {
            const res = await request(app).get('/api/backup').set(authHeader(token));
            expect(res.body.persons.some(p => p.id === personId)).toBe(true);
            expect(res.body.assets.some(a => a.id === assetId)).toBe(true);
            expect(res.body.history.some(h => h.assetId === assetId)).toBe(true);
            expect(res.body.categories.some(c => c.id === categoryId)).toBe(true);
        });
    });

    describe('POST /api/backup/restore', () => {
        it('requires authentication', async () => {
            const res = await request(app)
                .post('/api/backup/restore')
                .send({ persons: [], assets: [], history: [], categories: [] });
            expect(res.status).toBe(401);
        });

        it('restores data and subsequent GET /api/persons returns restored persons', async () => {
            const backupRes = await request(app).get('/api/backup').set(authHeader(token));
            const backup = backupRes.body;

            const newPersonId = uuidv4();
            const newCatId = uuidv4();
            const newAssetId = uuidv4();
            const payload = {
                persons: [{ id: newPersonId, name: 'Restored Person', displayOrder: 0 }],
                assets: [{
                    id: newAssetId,
                    name: 'Restored Asset',
                    category: 'restored-cat',
                    ownerId: newPersonId,
                    purchaseAmount: 1000,
                    purchaseDate: '2024-01-01',
                    currentValue: 1000,
                    symbol: null,
                }],
                history: [{
                    id: 1,
                    assetId: newAssetId,
                    date: '2024-01-01',
                    value: 1000,
                    investmentChange: 0,
                    notes: '',
                }],
                categories: [{ id: newCatId, key: 'restored-cat', label: 'Restored Cat', color: '#aabbcc', isDefault: 0 }],
                settings: [{ key: 'currency', value: 'EUR' }],
            };

            const restoreRes = await request(app)
                .post('/api/backup/restore')
                .set(authHeader(token))
                .send(payload);
            expect(restoreRes.status).toBe(200);

            const personsRes = await request(app).get('/api/persons').set(authHeader(token));
            expect(personsRes.body.some(p => p.name === 'Restored Person')).toBe(true);
            expect(personsRes.body.some(p => p.name === 'Backup Person')).toBe(false);

            const assetsRes = await request(app).get('/api/assets').set(authHeader(token));
            expect(assetsRes.body.some(a => a.name === 'Restored Asset')).toBe(true);
            expect(assetsRes.body.some(a => a.name === 'Backup Asset')).toBe(false);
        });

        it('restore with empty arrays results in empty tables', async () => {
            const payload = { persons: [], assets: [], history: [], categories: [] };
            const res = await request(app)
                .post('/api/backup/restore')
                .set(authHeader(token))
                .send(payload);
            expect(res.status).toBe(200);

            const personsRes = await request(app).get('/api/persons').set(authHeader(token));
            expect(personsRes.body).toEqual([]);

            const assetsRes = await request(app).get('/api/assets').set(authHeader(token));
            expect(assetsRes.body).toEqual([]);
        });

        it('rolls the whole restore back when an insert fails mid-way (atomicity)', async () => {
            // Seed a known person that must survive a failed restore.
            const survivor = await request(app)
                .post('/api/persons')
                .set(authHeader(token))
                .send({ name: 'Survivor' });
            const survivorId = survivor.body.id;

            const ownerId = uuidv4();
            const assetId = uuidv4();
            // Two history rows share id=1; the second INSERT violates the
            // asset_history PRIMARY KEY, failing the restore mid-transaction.
            const payload = {
                persons: [{ id: ownerId, name: 'Should Not Persist', displayOrder: 0 }],
                categories: [],
                assets: [
                    {
                        id: assetId,
                        name: 'Doomed',
                        category: 'cash',
                        ownerId,
                        purchaseAmount: 0,
                        purchaseDate: '2024-01-01',
                        currentValue: 0,
                        symbol: null,
                    },
                ],
                history: [
                    { id: 1, assetId, date: '2024-01-01', value: 1, investmentChange: 0, notes: '' },
                    { id: 1, assetId, date: '2024-02-01', value: 2, investmentChange: 0, notes: '' },
                ],
                settings: [],
            };

            const res = await request(app)
                .post('/api/backup/restore')
                .set(authHeader(token))
                .send(payload);
            expect(res.status).toBe(500);

            // Rollback must have undone both the DELETEs and the partial inserts.
            const personsRes = await request(app).get('/api/persons').set(authHeader(token));
            expect(personsRes.body.some(p => p.id === survivorId)).toBe(true);
            expect(personsRes.body.some(p => p.id === ownerId)).toBe(false);
        });
    });

    describe('POST /api/backup/restore — validation', () => {
        const validBase = () => ({
            persons: [],
            assets: [],
            history: [],
            categories: [],
        });

        it('rejects missing persons array → 400', async () => {
            const { persons, ...body } = validBase();
            const res = await request(app)
                .post('/api/backup/restore')
                .set(authHeader(token))
                .send(body);
            expect(res.status).toBe(400);
        });

        it('rejects missing assets array → 400', async () => {
            const { assets, ...body } = validBase();
            const res = await request(app)
                .post('/api/backup/restore')
                .set(authHeader(token))
                .send(body);
            expect(res.status).toBe(400);
        });

        it('rejects missing history array → 400', async () => {
            const { history, ...body } = validBase();
            const res = await request(app)
                .post('/api/backup/restore')
                .set(authHeader(token))
                .send(body);
            expect(res.status).toBe(400);
        });

        it('rejects missing categories array → 400', async () => {
            const { categories, ...body } = validBase();
            const res = await request(app)
                .post('/api/backup/restore')
                .set(authHeader(token))
                .send(body);
            expect(res.status).toBe(400);
        });

        it('rejects category with invalid hex color → 400', async () => {
            const res = await request(app)
                .post('/api/backup/restore')
                .set(authHeader(token))
                .send({
                    ...validBase(),
                    categories: [{ id: uuidv4(), key: 'k', label: 'L', color: 'not-a-color', isDefault: 0 }],
                });
            expect(res.status).toBe(400);
        });

        it('rejects asset with non-UUID ownerId → 400', async () => {
            const res = await request(app)
                .post('/api/backup/restore')
                .set(authHeader(token))
                .send({
                    ...validBase(),
                    persons: [{ id: uuidv4(), name: 'P', displayOrder: 0 }],
                    assets: [{
                        id: uuidv4(),
                        name: 'Bad Asset',
                        category: 'cat',
                        ownerId: 'not-a-uuid',
                        purchaseAmount: 0,
                        purchaseDate: '2024-01-01',
                        currentValue: 0,
                        symbol: null,
                    }],
                });
            expect(res.status).toBe(400);
        });

        it('rejects settings with disallowed key → 400', async () => {
            const res = await request(app)
                .post('/api/backup/restore')
                .set(authHeader(token))
                .send({
                    ...validBase(),
                    settings: [{ key: 'forbidden_key', value: 'USD' }],
                });
            expect(res.status).toBe(400);
        });
    });
});
