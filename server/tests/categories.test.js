const request = require('supertest');
const { createTestApp, setupAndLogin, authHeader } = require('./helpers');

describe('Categories routes', () => {
    let app, token, personId;

    beforeAll(async () => {
        ({ app } = await createTestApp());
        token = await setupAndLogin(app);

        const res = await request(app)
            .post('/api/persons')
            .set(authHeader(token))
            .send({ name: 'CategoryOwner' });
        personId = res.body.id;
    });

    async function createCategory(label = 'TestCat', color = '#aabbcc') {
        const res = await request(app)
            .post('/api/categories')
            .set(authHeader(token))
            .send({ label, color });
        return res.body;
    }

    describe('GET /api/categories', () => {
        it('returns an array of categories', async () => {
            const res = await request(app).get('/api/categories').set(authHeader(token));
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('POST /api/categories', () => {
        it('creates a category with label and color', async () => {
            const res = await request(app)
                .post('/api/categories')
                .set(authHeader(token))
                .send({ label: 'Commodities', color: '#ff9900' });
            expect(res.status).toBe(201);
            expect(res.body.label).toBe('Commodities');
            expect(res.body.color).toBe('#ff9900');
            expect(res.body.id).toBeDefined();
        });
    });

    describe('PUT /api/categories/:id', () => {
        it('updates label and color', async () => {
            const cat = await createCategory('OldLabel', '#000000');
            const res = await request(app)
                .put(`/api/categories/${cat.id}`)
                .set(authHeader(token))
                .send({ label: 'NewLabel', color: '#ffffff' });
            expect(res.status).toBe(200);
            expect(res.body.label).toBe('NewLabel');
            expect(res.body.color).toBe('#ffffff');
        });
    });

    describe('DELETE /api/categories/:id', () => {
        it('deletes an unused category', async () => {
            const cat = await createCategory('Unused', '#112233');
            const res = await request(app)
                .delete(`/api/categories/${cat.id}`)
                .set(authHeader(token));
            expect(res.status).toBe(204);

            const listRes = await request(app).get('/api/categories').set(authHeader(token));
            expect(listRes.body.find(c => c.id === cat.id)).toBeUndefined();
        });

        it('blocks deletion when the category is in use', async () => {
            const cat = await createCategory('InUse', '#445566');

            await request(app)
                .post('/api/assets')
                .set(authHeader(token))
                .send({
                    name: 'Asset Using Category',
                    category: cat.key,
                    ownerId: personId,
                    purchaseAmount: 100,
                    purchaseDate: '2024-01-01',
                    currentValue: 100,
                });

            const res = await request(app)
                .delete(`/api/categories/${cat.id}`)
                .set(authHeader(token));
            expect(res.status).toBe(409);
        });

        it('returns 404 for a non-existent category', async () => {
            const res = await request(app)
                .delete('/api/categories/00000000-0000-0000-0000-000000000000')
                .set(authHeader(token));
            expect(res.status).toBe(404);
        });
    });
});
