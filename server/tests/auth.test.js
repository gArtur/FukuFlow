const request = require('supertest');
const { createTestApp, authHeader } = require('./helpers');

describe('Auth routes', () => {
    let app;

    beforeAll(async () => {
        ({ app } = await createTestApp());
    });

    describe('POST /api/auth/setup', () => {
        it('creates password on first call and returns a token', async () => {
            const res = await request(app).post('/api/auth/setup').send({ password: 'TestPass123!' });
            expect(res.status).toBe(201);
            expect(res.body.token).toBeDefined();
        });

        it('rejects a second setup call with 409', async () => {
            const res = await request(app).post('/api/auth/setup').send({ password: 'AnotherPass123!' });
            expect(res.status).toBe(409);
        });
    });

    describe('POST /api/auth/login', () => {
        it('returns a JWT for correct password', async () => {
            const res = await request(app).post('/api/auth/login').send({ password: 'TestPass123!' });
            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });

        it('returns 401 for wrong password', async () => {
            const res = await request(app).post('/api/auth/login').send({ password: 'WrongPassword!' });
            expect(res.status).toBe(401);
        });

        it('returns 400 for missing password field', async () => {
            const res = await request(app).post('/api/auth/login').send({});
            expect(res.status).toBe(400);
        });
    });

    describe('Protected routes', () => {
        it('rejects requests with no token', async () => {
            const res = await request(app).get('/api/assets');
            expect(res.status).toBe(401);
        });

        it('rejects requests with a tampered token', async () => {
            const res = await request(app)
                .get('/api/assets')
                .set('Authorization', 'Bearer this.is.fake');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('returns 200', async () => {
            const res = await request(app).post('/api/auth/logout');
            expect(res.status).toBe(200);
        });
    });

    describe('POST /api/auth/change-password', () => {
        let password = 'TestPass123!';

        it('changes the password and returns a new token', async () => {
            const res = await request(app).post('/api/auth/change-password').send({
                currentPassword: password,
                newPassword: 'NewPassword456!',
            });
            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            password = 'NewPassword456!';
        });

        it('returns 401 for wrong current password', async () => {
            const res = await request(app).post('/api/auth/change-password').send({
                currentPassword: 'WrongCurrentPassword!',
                newPassword: 'NewPassword456!',
            });
            expect(res.status).toBe(401);
        });

        it('old token is invalidated after password change', async () => {
            const loginRes = await request(app).post('/api/auth/login').send({ password });
            const oldToken = loginRes.body.token;

            await request(app).post('/api/auth/change-password').send({
                currentPassword: password,
                newPassword: 'FinalPassword789!',
            });

            const res = await request(app).get('/api/assets').set(authHeader(oldToken));
            expect(res.status).toBe(401);
        });
    });
});
