const request = require('supertest');
const { createTestApp, setupAndLogin, authHeader } = require('./helpers');

describe('Persons routes', () => {
    let app, db, token;

    beforeAll(async () => {
        ({ app, db } = await createTestApp());
        token = await setupAndLogin(app);
    });

    async function createPerson(name) {
        const res = await request(app)
            .post('/api/persons')
            .set(authHeader(token))
            .send({ name });
        return res.body;
    }

    describe('GET /api/persons', () => {
        it('returns persons ordered by displayOrder ascending', async () => {
            await createPerson('Charlie');
            await createPerson('Alice');
            await createPerson('Bob');

            const res = await request(app).get('/api/persons').set(authHeader(token));
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

            const orders = res.body.map(p => p.displayOrder);
            expect(orders).toEqual([...orders].sort((a, b) => a - b));
        });
    });

    describe('POST /api/persons', () => {
        it('creates a person and auto-assigns next displayOrder', async () => {
            const existingRes = await request(app).get('/api/persons').set(authHeader(token));
            const maxOrder = Math.max(...existingRes.body.map(p => p.displayOrder));

            const res = await request(app)
                .post('/api/persons')
                .set(authHeader(token))
                .send({ name: 'NewPerson' });
            expect(res.status).toBe(201);
            expect(res.body.displayOrder).toBe(maxOrder + 1);
            expect(res.body.name).toBe('NewPerson');
        });
    });

    describe('PUT /api/persons/:id', () => {
        it('updates a person name', async () => {
            const person = await createPerson('OldName');
            const res = await request(app)
                .put(`/api/persons/${person.id}`)
                .set(authHeader(token))
                .send({ name: 'NewName' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('NewName');
        });
    });

    describe('PUT /api/persons/reorder', () => {
        it('updates all displayOrders atomically', async () => {
            const p1 = await createPerson('Reorder1');
            const p2 = await createPerson('Reorder2');
            const p3 = await createPerson('Reorder3');

            const ids = [p3.id, p1.id, p2.id];
            const res = await request(app)
                .put('/api/persons/reorder')
                .set(authHeader(token))
                .send({ ids });
            expect(res.status).toBe(200);

            const listRes = await request(app).get('/api/persons').set(authHeader(token));
            const p3After = listRes.body.find(p => p.id === p3.id);
            const p1After = listRes.body.find(p => p.id === p1.id);
            expect(p3After.displayOrder).toBe(0);
            expect(p1After.displayOrder).toBe(1);
        });
    });

    describe('DELETE /api/persons/:id', () => {
        it('removes the person', async () => {
            const person = await createPerson('ToDelete');
            await request(app).delete(`/api/persons/${person.id}`).set(authHeader(token));

            const res = await request(app).get('/api/persons').set(authHeader(token));
            expect(res.body.find(p => p.id === person.id)).toBeUndefined();
        });

        it('cascades deletion to owned assets and their history', async () => {
            const person = await createPerson('CascadeOwner');

            const assetRes = await request(app)
                .post('/api/assets')
                .set(authHeader(token))
                .send({
                    name: 'Cascade Asset',
                    category: 'cash',
                    ownerId: person.id,
                    purchaseAmount: 500,
                    purchaseDate: '2024-01-01',
                    currentValue: 500,
                });
            const assetId = assetRes.body.id;

            await request(app)
                .post(`/api/assets/${assetId}/snapshot`)
                .set(authHeader(token))
                .send({ value: 600, date: '2024-06-01' });

            await request(app).delete(`/api/persons/${person.id}`).set(authHeader(token));

            const assetsRes = await request(app).get('/api/assets').set(authHeader(token));
            expect(assetsRes.body.find(a => a.id === assetId)).toBeUndefined();

            const historyCount = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM asset_history WHERE assetId = ?', [assetId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });
            expect(historyCount).toBe(0);
        });
    });
});
