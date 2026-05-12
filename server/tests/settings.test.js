const request = require('supertest');
const { createTestApp, setupAndLogin, authHeader } = require('./helpers');

describe('Settings routes', () => {
    let app, token;

    beforeAll(async () => {
        ({ app } = await createTestApp());
        token = await setupAndLogin(app);
    });

    describe('GET /api/settings', () => {
        it('requires authentication', async () => {
            const res = await request(app).get('/api/settings');
            expect(res.status).toBe(401);
        });

        it('returns 200 with an object (empty initially)', async () => {
            const res = await request(app).get('/api/settings').set(authHeader(token));
            expect(res.status).toBe(200);
            expect(typeof res.body).toBe('object');
            expect(Array.isArray(res.body)).toBe(false);
        });

        it('returns saved setting after POST', async () => {
            await request(app)
                .post('/api/settings')
                .set(authHeader(token))
                .send({ key: 'currency', value: 'USD' });

            const res = await request(app).get('/api/settings').set(authHeader(token));
            expect(res.status).toBe(200);
            expect(res.body.currency).toBe('USD');
        });
    });

    describe('POST /api/settings', () => {
        it('requires authentication', async () => {
            const res = await request(app)
                .post('/api/settings')
                .send({ key: 'currency', value: 'EUR' });
            expect(res.status).toBe(401);
        });

        it('saves a valid key and echoes { key, value }', async () => {
            const res = await request(app)
                .post('/api/settings')
                .set(authHeader(token))
                .send({ key: 'currency', value: 'GBP' });
            expect(res.status).toBe(200);
            expect(res.body.key).toBe('currency');
            expect(res.body.value).toBe('GBP');
        });

        it('saves the theme key', async () => {
            const res = await request(app)
                .post('/api/settings')
                .set(authHeader(token))
                .send({ key: 'theme', value: 'dark' });
            expect(res.status).toBe(200);
            expect(res.body.key).toBe('theme');
        });

        it('upserts: second POST with same key updates the value', async () => {
            await request(app)
                .post('/api/settings')
                .set(authHeader(token))
                .send({ key: 'currency', value: 'USD' });

            await request(app)
                .post('/api/settings')
                .set(authHeader(token))
                .send({ key: 'currency', value: 'JPY' });

            const res = await request(app).get('/api/settings').set(authHeader(token));
            expect(res.body.currency).toBe('JPY');
        });

        it.each([
            'currency',
            'theme',
            'defaultFilter',
            'defaultDateRange',
            'showAssetHeatmap',
            'assetsFollowGeneral',
        ])('accepts allowed key "%s"', async (key) => {
            const res = await request(app)
                .post('/api/settings')
                .set(authHeader(token))
                .send({ key, value: 'testvalue' });
            expect(res.status).toBe(200);
        });

        it('rejects disallowed key → 400', async () => {
            const res = await request(app)
                .post('/api/settings')
                .set(authHeader(token))
                .send({ key: 'adminMode', value: 'true' });
            expect(res.status).toBe(400);
        });

        it('rejects missing key → 400', async () => {
            const res = await request(app)
                .post('/api/settings')
                .set(authHeader(token))
                .send({ value: 'USD' });
            expect(res.status).toBe(400);
        });

        it('rejects missing value → 400', async () => {
            const res = await request(app)
                .post('/api/settings')
                .set(authHeader(token))
                .send({ key: 'currency' });
            expect(res.status).toBe(400);
        });

        it('rejects value exceeding 50 characters → 400', async () => {
            const res = await request(app)
                .post('/api/settings')
                .set(authHeader(token))
                .send({ key: 'currency', value: 'X'.repeat(51) });
            expect(res.status).toBe(400);
        });
    });
});
