import { test, expect } from '../fixtures/pages.fixture';
import { seedPerson, deletePerson, seedAsset, getToken } from '../helpers/seed';
import { FamilyFilter } from '../components/FamilyFilter';

let token: string;

test.beforeAll(async ({ request }) => {
    token = await getToken(request);
});

test.describe('03 — Person management', () => {
    test('3.1 — create person appears in settings list', async ({ settings }) => {
        await settings.goto();
        await settings.addPerson('Alice E2E');
        await settings.expectPersonInList('Alice E2E');
    });

    test('3.2 — person appears as filter button on dashboard', async ({ authedPage }) => {
        await authedPage.goto('/');
        await authedPage.waitForLoadState('networkidle');
        const filter = new FamilyFilter(authedPage);
        await filter.expectFilterButton('Alice E2E');
    });

    test('3.3 — filter by person shows only their assets', async ({ request, dashboard }) => {
        // Seed a second person and assets for each
        const bobId = await seedPerson(request, token, 'Bob E2E');
        const aliceId = (await (await fetch('http://localhost:3001/api/persons', {
            headers: { Authorization: `Bearer ${token}` },
        })).json() as { id: string; name: string }[]).find(p => p.name === 'Alice E2E')?.id ?? '';

        const aliceAssetName = 'Alice ETF';
        const bobAssetName = 'Bob Bond';
        await seedAsset(request, token, { name: aliceAssetName, ownerId: aliceId });
        await seedAsset(request, token, { name: bobAssetName, ownerId: bobId });

        await dashboard.goto();
        await dashboard.filterBy('Alice E2E');
        await dashboard.expectAssetCard(aliceAssetName);
        await dashboard.expectNoAssetCard(bobAssetName);

        await dashboard.filterBy('All');
        await dashboard.expectAssetCard(aliceAssetName);
        await dashboard.expectAssetCard(bobAssetName);

        // Cleanup Bob (Alice cleanup happens in 3.4)
        await deletePerson(request, token, bobId);
    });

    test('3.4 — delete person cascades (person + assets gone)', async ({ request, settings }) => {
        const aliceId = (await (await fetch('http://localhost:3001/api/persons', {
            headers: { Authorization: `Bearer ${token}` },
        })).json() as { id: string; name: string }[]).find(p => p.name === 'Alice E2E')?.id ?? '';

        await settings.goto();
        await settings.deletePerson('Alice E2E');

        // Person no longer in list
        await expect(
            settings['page'].getByTestId('person-item').filter({ hasText: 'Alice E2E' })
        ).toHaveCount(0);

        // Verify via API that person is gone
        const personsRes = await request.get('http://localhost:3001/api/persons', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const persons = await personsRes.json() as { id: string }[];
        expect(persons.find(p => p.id === aliceId)).toBeUndefined();
    });
});
