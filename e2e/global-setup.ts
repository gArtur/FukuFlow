import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3001';
const TEST_PASSWORD = 'TestPassword1!';
// Password used in test 1.6 — if a previous run crashed mid-test, the DB
// may still have this password set. We recover by changing it back.
const FALLBACK_PASSWORD = 'NewPassword2@2025';
const AUTH_DIR = path.join(__dirname, '.auth');
const AUTH_STATE = path.join(AUTH_DIR, 'state.json');

export { TEST_PASSWORD };

async function waitForServer(url: string, retries = 20): Promise<void> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (res.ok) return;
        } catch {
            // not ready yet
        }
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(`Server at ${url} never became ready`);
}

async function tryLogin(password: string): Promise<string | null> {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { token: string };
    return data.token;
}

async function changePassword(currentPw: string, newPw: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Password change failed (${res.status}): ${body}`);
    }
}

export default async function globalSetup(_config: FullConfig) {
    await waitForServer(`${BASE_URL}/api/health`);

    // Setup password (idempotent — returns 409 if already set)
    const setupRes = await fetch(`${BASE_URL}/api/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: TEST_PASSWORD }),
    });

    if (!setupRes.ok && setupRes.status !== 409) {
        const body = await setupRes.text();
        throw new Error(`Auth setup failed (${setupRes.status}): ${body}`);
    }

    // Try to login with TEST_PASSWORD first
    let token = await tryLogin(TEST_PASSWORD);

    if (!token) {
        // A previous interrupted test may have changed the password to FALLBACK_PASSWORD.
        // Restore TEST_PASSWORD and re-login.
        const fallbackToken = await tryLogin(FALLBACK_PASSWORD);
        if (!fallbackToken) {
            throw new Error(
                `Login failed with both TEST_PASSWORD and FALLBACK_PASSWORD. ` +
                `Delete server/db/e2e-test.db and retry.`
            );
        }
        await changePassword(FALLBACK_PASSWORD, TEST_PASSWORD);
        token = await tryLogin(TEST_PASSWORD);
        if (!token) throw new Error('Login failed after restoring TEST_PASSWORD');
    }

    // Save storageState so fixtures can inject the auth token without UI login
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const storageState = {
        cookies: [],
        origins: [
            {
                origin: 'http://localhost:5173',
                localStorage: [{ name: 'auth_token', value: token }],
            },
        ],
    };
    fs.writeFileSync(AUTH_STATE, JSON.stringify(storageState, null, 2));

    // Warm up the Vite dev server
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await browser.close();
}
