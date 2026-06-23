import { test, expect } from '../fixtures/pages.fixture';
import {
    seedPerson,
    deletePerson,
    seedCategory,
    deleteCategory,
    getToken,
    getBackupJson,
} from '../helpers/seed';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let token: string;
let settingsPersonId: string;

test.beforeAll(async ({ request }) => {
    token = await getToken(request);
    settingsPersonId = await seedPerson(request, token, 'Settings E2E Person');
});

test.afterAll(async ({ request }) => {
    await deletePerson(request, token, settingsPersonId);
});

test.describe('05 - Settings', () => {
    test('5.1 - currency change: EUR symbol appears on dashboard', async ({ settings, dashboard }) => {
        await settings.goto();
        await settings.setCurrency('EUR');

        await dashboard.goto();
        await dashboard.expectTotalContains('€');

        // Restore
        await settings.goto();
        await settings.setCurrency('USD');
    });

    test('5.2 - add custom category appears in add-asset dropdown', async ({
        settings,
        dashboard,
        request,
    }) => {
        await settings.goto();
        await settings.addCategory('Real Estate E2E');
        await settings.expectCategoryInList('Real Estate E2E');

        // Open add-asset modal and verify option is available
        await dashboard.goto();
        const modal = await dashboard.openAddAsset();
        await modal.expectCategoryOption('Real Estate E2E');

        // Close modal and cleanup
        await dashboard.page.keyboard.press('Escape');

        // Delete the category via API (no assets using it)
        const categoriesRes = await request.get('http://localhost:3001/api/categories', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const categories = await categoriesRes.json() as { id: string; label: string }[];
        const cat = categories.find(c => c.label === 'Real Estate E2E');
        if (cat) await deleteCategory(request, token, cat.id);
    });

    test('5.3 - delete category disappears from list', async ({ settings, request }) => {
        const catId = await seedCategory(request, token, 'Throwaway Cat E2E');

        await settings.goto();
        await settings.expectCategoryInList('Throwaway Cat E2E');

        await settings.deleteCategory('Throwaway Cat E2E');
        await settings.expectCategoryNotInList('Throwaway Cat E2E');
    });

    test('5.4 - backup download returns a JSON file', async ({ settings }) => {
        await settings.goto();
        const download = await settings.downloadBackup();
        expect(download.suggestedFilename()).toMatch(/\.json$/);
    });

    test('5.5 - restore backup leaves app functional', async ({ settings, dashboard, request }) => {
        // Get backup JSON via API
        const backupData = await getBackupJson(request, token);
        const tmpFile = path.join(os.tmpdir(), 'fukuflow-e2e-backup.json');
        fs.writeFileSync(tmpFile, JSON.stringify(backupData));

        await settings.goto();
        await settings.restoreBackupFile(tmpFile);

        // Dashboard should still render after restore
        await dashboard.goto();
        await dashboard.expectTotalWorthVisible();

        fs.unlinkSync(tmpFile);
    });
});
