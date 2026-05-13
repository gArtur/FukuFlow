import { test as base, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { SettingsPage } from '../pages/SettingsPage';
import { TEST_PASSWORD } from '../global-setup';

const FALLBACK_PASSWORD = 'NewPassword2@2025';

// Auth tests use raw `page` (no storageState) so they drive the UI themselves
const test = base;

const AUTH_DIR = path.join(__dirname, '..', '.auth');
const AUTH_STATE = path.join(AUTH_DIR, 'state.json');

// After auth tests run, password changes have incremented tokenVersion.
// Refresh the storageState so subsequent spec files get a valid token.
test.afterAll(async () => {
    const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: TEST_PASSWORD }),
    });
    if (!res.ok) return;
    const { token } = await res.json() as { token: string };
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const storageState = {
        cookies: [],
        origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'auth_token', value: token }] }],
    };
    fs.writeFileSync(AUTH_STATE, JSON.stringify(storageState, null, 2));
});

test.describe('01 — Authentication flow', () => {
    test('1.2 — login with correct password shows dashboard', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.login(TEST_PASSWORD);
        await page.waitForURL('/');
        await expect(page.locator('body')).not.toContainText('Enter your password');
    });

    test('1.3 — login with wrong password shows error', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await page.waitForSelector('[data-testid="login-password"]');
        await page.getByTestId('login-password').fill('wrongpassword');
        await page.getByTestId('login-submit').click();
        await loginPage.expectError('Invalid password');
        // Still on login page
        await expect(page.getByTestId('login-form')).toBeVisible();
    });

    test('1.4 — token persists across page reload', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.login(TEST_PASSWORD);
        await page.waitForURL('/');
        await page.reload();
        // Should still be authenticated — dashboard renders
        await expect(page.getByTestId('total-worth-chart')).toBeVisible({ timeout: 10_000 });
    });

    test('1.5 — logout redirects to login', async ({ browser }) => {
        // Use storageState for this test (already authenticated)
        const context = await browser.newContext({
            storageState: path.join(__dirname, '..', '.auth', 'state.json'),
        });
        const page = await context.newPage();
        const settings = new SettingsPage(page);

        await settings.goto();
        await settings.logout();

        // App renders login form in-place (URL stays at /settings, no redirect)
        await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 5_000 });

        const token = await page.evaluate(() => localStorage.getItem('auth_token'));
        expect(token).toBeNull();

        await context.close();
    });

    test('1.6 — password change: login with new password succeeds', async ({ browser }) => {
        const newPassword = FALLBACK_PASSWORD;
        const authStatePath = path.join(__dirname, '..', '.auth', 'state.json');
        const context = await browser.newContext({
            storageState: authStatePath,
        });
        const page = await context.newPage();
        const settings = new SettingsPage(page);

        await settings.goto();
        await settings.changePassword(TEST_PASSWORD, newPassword);

        // Logout (login form renders in-place, URL stays at /settings)
        await settings.logout();

        // Login with new password (still at /settings URL)
        await page.getByTestId('login-password').fill(newPassword);
        await page.getByTestId('login-submit').click();
        // Navigate to dashboard to confirm authentication
        await page.goto('/');
        await expect(page.getByTestId('total-worth-chart')).toBeVisible({ timeout: 10_000 });

        // Restore original password
        await page.goto('/settings');
        await page.waitForURL('/settings');
        const settingsAfter = new SettingsPage(page);
        await settingsAfter.changePassword(newPassword, TEST_PASSWORD);

        // Refresh storageState — password change increments tokenVersion,
        // so the saved token is invalid; save the new valid one here.
        await context.storageState({ path: authStatePath });

        await context.close();
    });

    test('1.7 — old token invalidated after password change via API', async ({ browser, request }) => {
        const context = await browser.newContext({
            storageState: path.join(__dirname, '..', '.auth', 'state.json'),
        });
        const page = await context.newPage();

        // Navigate to dashboard first (authenticated)
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const oldToken = await page.evaluate(() => localStorage.getItem('auth_token'));

        // Change password via API (invalidates old tokenVersion)
        const loginRes = await request.post('http://localhost:3001/api/auth/login', {
            data: { password: TEST_PASSWORD },
        });
        const { token: freshToken } = await loginRes.json();

        const changeRes = await request.post('http://localhost:3001/api/auth/change-password', {
            data: { currentPassword: TEST_PASSWORD, newPassword: TEST_PASSWORD },
            headers: { Authorization: `Bearer ${freshToken}` },
        });
        expect(changeRes.ok()).toBeTruthy();

        // Old token should now be rejected — navigating to a protected route redirects to login
        await page.evaluate(token => localStorage.setItem('auth_token', token!), oldToken);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        // AuthContext will call getAuthStatus and detect invalid token → redirect
        await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 10_000 });

        await context.close();
    });
});
