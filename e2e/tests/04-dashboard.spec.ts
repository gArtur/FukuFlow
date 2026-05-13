import { test, expect } from '../fixtures/pages.fixture';
import { seedPerson, deletePerson, seedAsset, seedSnapshot, getToken } from '../helpers/seed';

let token: string;
const persons: string[] = [];

test.beforeAll(async ({ request }) => {
    token = await getToken(request);

    // Seed 2 persons and 3 assets with snapshot history
    const alice = await seedPerson(request, token, 'Dashboard Alice');
    const bob = await seedPerson(request, token, 'Dashboard Bob');
    persons.push(alice, bob);

    const etfId = await seedAsset(request, token, { name: 'Dashboard ETF', ownerId: alice, category: 'etf', currentValue: 10000, purchaseAmount: 8000 });
    const cryptoId = await seedAsset(request, token, { name: 'Dashboard Crypto', ownerId: alice, category: 'crypto', currentValue: 5000, purchaseAmount: 3000 });
    const bondId = await seedAsset(request, token, { name: 'Dashboard Bond', ownerId: bob, category: 'bonds', currentValue: 7000, purchaseAmount: 7000 });

    // Add snapshots so charts have data
    const dates = ['2024-06-01', '2024-09-01', '2025-01-01'];
    for (const [assetId, values] of [
        [etfId,   [8500, 9000, 10000]],
        [cryptoId,[3500, 4000, 5000]],
        [bondId,  [7000, 7000, 7000]],
    ] as [string, number[]][]) {
        for (let i = 0; i < dates.length; i++) {
            await seedSnapshot(request, token, assetId, { value: values[i], date: dates[i] });
        }
    }
});

test.afterAll(async ({ request }) => {
    for (const id of persons) {
        await deletePerson(request, token, id);
    }
});

test.describe('04 — Dashboard display', () => {
    test('4.1 — TotalWorthChart renders with non-zero value', async ({ dashboard }) => {
        await dashboard.goto();
        await dashboard.expectTotalWorthVisible();
        // Value should contain a number (not be empty or $0)
        const valueText = await dashboard.totalWorthValue.textContent();
        expect(valueText).toBeTruthy();
        expect(valueText).not.toBe('$0');
    });

    test('4.2 — time range buttons toggle', async ({ dashboard }) => {
        await dashboard.goto();

        await dashboard.selectTimeRange('YTD');
        await expect(dashboard.page.getByTestId('time-range-YTD')).toHaveAttribute('aria-pressed', 'true');

        await dashboard.selectTimeRange('5Y');
        await expect(dashboard.page.getByTestId('time-range-5Y')).toHaveAttribute('aria-pressed', 'true');
        await expect(dashboard.page.getByTestId('time-range-YTD')).toHaveAttribute('aria-pressed', 'false');
    });

    test('4.3 — AllocationChart is visible', async ({ dashboard }) => {
        await dashboard.goto();
        await expect(dashboard.allocationChart).toBeVisible();
    });

    test('4.4 — asset cards show names and values', async ({ dashboard }) => {
        await dashboard.goto();
        const count = await dashboard.assetCards.count();
        expect(count).toBeGreaterThanOrEqual(3);

        await dashboard.expectAssetCard('Dashboard ETF');
        await dashboard.expectAssetCard('Dashboard Crypto');
        await dashboard.expectAssetCard('Dashboard Bond');
    });

    test('4.5 — navigate to heatmap page', async ({ dashboard, heatmap }) => {
        await dashboard.goToHeatmap();
        await heatmap.expectGridVisible();
    });
});
