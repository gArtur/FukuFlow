import { test as authTest, expect } from './auth.fixture';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AssetDetailPage } from '../pages/AssetDetailPage';
import { SettingsPage } from '../pages/SettingsPage';
import { HeatmapPage } from '../pages/HeatmapPage';

interface PageFixtures {
    loginPage: LoginPage;
    dashboard: DashboardPage;
    assetDetail: AssetDetailPage;
    settings: SettingsPage;
    heatmap: HeatmapPage;
}

export const test = authTest.extend<PageFixtures>({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    dashboard: async ({ authedPage }, use) => {
        await use(new DashboardPage(authedPage));
    },
    assetDetail: async ({ authedPage }, use) => {
        await use(new AssetDetailPage(authedPage));
    },
    settings: async ({ authedPage }, use) => {
        await use(new SettingsPage(authedPage));
    },
    heatmap: async ({ authedPage }, use) => {
        await use(new HeatmapPage(authedPage));
    },
});

export { expect };
