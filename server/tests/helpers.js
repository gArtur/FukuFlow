const sqlite3 = require('sqlite3').verbose();
const request = require('supertest');
const { createApp } = require('../app');
const { initSchema } = require('../db');

async function createTestApp() {
    const db = new sqlite3.Database(':memory:');
    // Enable foreign key constraints (SQLite disables them by default)
    await new Promise((resolve, reject) => {
        db.run('PRAGMA foreign_keys = ON', (err) => err ? reject(err) : resolve());
    });
    await initSchema(db);
    const app = createApp(db);
    return { app, db };
}

async function setupAndLogin(app, password = 'TestPass123!') {
    await request(app).post('/api/auth/setup').send({ password });
    const res = await request(app).post('/api/auth/login').send({ password });
    return res.body.token;
}

function authHeader(token) {
    return { Authorization: `Bearer ${token}` };
}

module.exports = { createTestApp, setupAndLogin, authHeader };
