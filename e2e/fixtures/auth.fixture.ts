import { test as base, type Page } from '@playwright/test';
import * as path from 'path';

const AUTH_STATE = path.join(__dirname, '..', '.auth', 'state.json');

interface AuthFixtures {
    authedPage: Page;
}

export const test = base.extend<AuthFixtures>({
    authedPage: async ({ browser }, use) => {
        const context = await browser.newContext({ storageState: AUTH_STATE });
        const page = await context.newPage();
        await use(page);
        await context.close();
    },
});

export { expect } from '@playwright/test';
