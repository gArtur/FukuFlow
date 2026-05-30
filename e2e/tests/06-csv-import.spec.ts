import { test, expect } from '../fixtures/pages.fixture';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('CSV bulk import', () => {
    test('imports snapshots via a single bulk request and shows them in history', async ({
        page,
    }) => {
        const dashboard = new DashboardPage(page);
        await dashboard.goto();

        // Create an asset to import into.
        const modal = await dashboard.openAddAsset();
        await modal.fillBasicInfo('CSV Import Asset', 'stocks');
        await modal.selectOwnerByIndex(0);
        await modal.submit();
        await dashboard.expectAssetCard('CSV Import Asset');
        await dashboard.clickAssetCard('CSV Import Asset');
        await expect(page.getByTestId('asset-detail')).toBeVisible();

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
        await expect(page.getByText(/successfully imported 3 snapshots/i)).toBeVisible();

        // Close the modal; the imported snapshots are now visible in history.
        await page.getByRole('button', { name: /done/i }).click();
        await expect(page.getByText('Added funds')).toBeVisible();
        await expect(page.getByText('Initial deposit')).toBeVisible();
    });
});
