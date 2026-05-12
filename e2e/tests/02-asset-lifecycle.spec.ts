import { test, expect } from '../fixtures/pages.fixture';
import { seedPerson, deletePerson, getToken } from '../helpers/seed';

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

let token: string;
let personId: string;
const OWNER_NAME = 'E2E Owner';
const ASSET_NAME = 'Test ETF';

test.beforeAll(async ({ request }) => {
    token = await getToken(request);
    personId = await seedPerson(request, token, OWNER_NAME);
});

test.afterAll(async ({ request }) => {
    // Cascade-deletes all assets owned by this person
    await deletePerson(request, token, personId);
});

test.describe('02 — Asset lifecycle', () => {
    test('2.1 — create asset via modal', async ({ dashboard }) => {
        await dashboard.goto();
        const modal = await dashboard.openAddAsset();
        await modal.fill({ name: ASSET_NAME, owner: OWNER_NAME });
        await modal.submit();

        await dashboard.expectAssetCard(ASSET_NAME);
    });

    test('2.2 — navigate to asset detail page', async ({ dashboard, assetDetail }) => {
        await dashboard.goto();
        await dashboard.clickAssetCard(ASSET_NAME);

        const ownerSlug = slugify(OWNER_NAME);
        const assetSlug = slugify(ASSET_NAME);
        await assetDetail.expectUrl(ownerSlug, assetSlug);
        await assetDetail.expectSnapshotTableEmpty();
    });

    test('2.3 — add snapshot', async ({ dashboard, assetDetail }) => {
        await dashboard.goto();
        await dashboard.clickAssetCard(ASSET_NAME);

        const snapshotModal = await assetDetail.openAddSnapshot();
        await snapshotModal.fill({ value: '50000', date: '2025-01-15' });
        await snapshotModal.submit();

        // Row appears in the table
        await expect(assetDetail.page.getByTestId('snapshot-row-edit').first()).toBeVisible();
    });

    test('2.4 — edit snapshot value', async ({ dashboard, assetDetail }) => {
        await dashboard.goto();
        await dashboard.clickAssetCard(ASSET_NAME);

        const editModal = await assetDetail.editFirstSnapshot();
        await editModal.updateValue('55000');

        // Row still present after edit
        await expect(assetDetail.page.getByTestId('snapshot-row-edit').first()).toBeVisible();
    });

    test('2.5 — delete snapshot', async ({ dashboard, assetDetail }) => {
        await dashboard.goto();
        await dashboard.clickAssetCard(ASSET_NAME);

        const editModal = await assetDetail.editFirstSnapshot();
        await editModal.delete();

        await assetDetail.expectSnapshotTableEmpty();
    });

    test('2.6 — delete asset redirects to dashboard', async ({ dashboard, assetDetail }) => {
        await dashboard.goto();
        await dashboard.clickAssetCard(ASSET_NAME);
        await assetDetail.deleteAsset();

        // Back on dashboard, asset card is gone
        await expect(assetDetail.page).toHaveURL('/');
        await dashboard.expectNoAssetCard(ASSET_NAME);
    });
});
