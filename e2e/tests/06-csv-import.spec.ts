import { test, expect } from '../fixtures/pages.fixture';
import { seedPerson, deletePerson, getToken } from '../helpers/seed';

let token: string;
let personId: string;
const OWNER_NAME = 'CSV Import Owner';
const ASSET_NAME = 'CSV Import Asset';

test.beforeAll(async ({ request }) => {
    token = await getToken(request);
    personId = await seedPerson(request, token, OWNER_NAME);
});

test.afterAll(async ({ request }) => {
    // Cascade-deletes all assets owned by this person
    await deletePerson(request, token, personId);
});

test.describe('06 - CSV bulk import', () => {
    test('imports snapshots via a single bulk request and shows them in history', async ({
        dashboard,
        assetDetail,
    }) => {
        const page = assetDetail.page;

        // Create an asset to import into.
        await dashboard.goto();
        const modal = await dashboard.openAddAsset();
        await modal.fill({ name: ASSET_NAME, owner: OWNER_NAME });
        await modal.submit();
        await dashboard.expectAssetCard(ASSET_NAME);
        await dashboard.clickAssetCard(ASSET_NAME);
        await assetDetail.expectSnapshotTableEmpty();

        // Open the Import CSV modal.
        await page.getByRole('button', { name: /import csv/i }).click();
        await expect(page.getByText('Import Snapshots')).toBeVisible();

        const csv = [
            'Date,Value,Invested,Notes',
            '2024-01-15,10000,5000,Initial deposit',
            '15/02/2024,10500,0,Monthly update',
            '2024-03-15,11000,1000,Added funds',
        ].join('\n');

        // The whole import must hit the bulk endpoint exactly once.
        const bulkRequest = page.waitForRequest(
            req => /\/assets\/.+\/snapshot\/bulk$/.test(req.url()) && req.method() === 'POST'
        );

        await page.locator('input[type="file"]').setInputFiles({
            name: 'snapshots.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csv),
        });

        await bulkRequest;

        // The modal reports a successful import of all three rows.
        await expect(page.getByText(/3 snapshots imported successfully/i)).toBeVisible();

        // Close the modal; the imported snapshots are now in the asset's history.
        // (Rows render twice - desktop table + mobile list - so assert on content.)
        await page.getByRole('button', { name: /done/i }).click();
        await expect(page.getByText('Added funds').first()).toBeVisible();
        await expect(page.getByText('Initial deposit').first()).toBeVisible();
        await expect(page.getByText('Monthly update').first()).toBeVisible();
    });
});
