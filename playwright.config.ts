import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const AUTH_STATE = path.join(__dirname, 'e2e', '.auth', 'state.json');

export default defineConfig({
    testDir: './e2e/tests',
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: [['html', { outputFolder: 'e2e/playwright-report', open: 'never' }], ['list']],
    outputDir: 'e2e/test-results',

    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    webServer: [
        {
            command: 'node server/index.js',
            url: 'http://localhost:3001/api/health',
            reuseExistingServer: !process.env.CI,
            timeout: 30_000,
            env: {
                NODE_ENV: 'test',
                PORT: '3001',
                HOST: '0.0.0.0',
                CORS_ORIGIN: 'http://localhost:5173',
                DATABASE_PATH: './db/e2e-test.db',
                JWT_SECRET: 'e2e-test-secret-32-chars-minimum!!',
            },
        },
        {
            command: 'npm run dev',
            url: 'http://localhost:5173',
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
        },
    ],

    globalSetup: './e2e/global-setup.ts',
    globalTeardown: './e2e/global-teardown.ts',
});

export { AUTH_STATE };
