import { type Page, expect } from '@playwright/test';
import { AddAssetModal } from '../components/AddAssetModal';

export class DashboardPage {
    readonly addAssetModal: AddAssetModal;

    constructor(readonly page: Page) {
        this.addAssetModal = new AddAssetModal(page);
    }

    async goto() {
        await this.page.goto('/');
        await this.page.waitForURL('/');
        await this.page.waitForLoadState('networkidle');
        return this;
    }

    get totalWorthChart()  { return this.page.getByTestId('total-worth-chart'); }
    get totalWorthValue()  { return this.page.getByTestId('total-worth-value'); }
    get allocationChart()  { return this.page.getByTestId('allocation-chart'); }
    get assetCards()       { return this.page.getByTestId('asset-card'); }
    get familyFilter()     { return this.page.getByTestId('family-filter'); }
    get addAssetBtn()      { return this.page.getByTestId('add-asset-btn'); }
    get timeRangeTabs()    { return this.page.getByTestId('time-range-tabs'); }

    assetCard(name: string) {
        return this.assetCards.filter({ hasText: name });
    }

    async openAddAsset() {
        await this.addAssetBtn.click();
        await expect(this.page.getByTestId('add-asset-modal')).toBeVisible();
        return this.addAssetModal;
    }

    async filterBy(name: string) {
        if (name === 'All') {
            await this.page.getByTestId('filter-all').click();
        } else {
            await this.familyFilter.getByText(name, { exact: true }).click();
        }
        await this.page.waitForLoadState('networkidle');
        return this;
    }

    async selectTimeRange(range: string) {
        await this.page.getByTestId(`time-range-${range}`).click();
        return this;
    }

    async clickAssetCard(name: string) {
        await this.assetCard(name).click();
    }

    async goToHeatmap() {
        await this.page.goto('/heatmap');
        await this.page.waitForURL('/heatmap');
    }

    async expectAssetCard(name: string) {
        await expect(this.assetCard(name).first()).toBeVisible();
        return this;
    }

    async expectNoAssetCard(name: string) {
        await expect(this.assetCard(name)).toHaveCount(0);
        return this;
    }

    async expectTotalWorthVisible() {
        await expect(this.totalWorthChart).toBeVisible();
        return this;
    }

    async expectTotalContains(text: string) {
        await expect(this.totalWorthValue).toContainText(text);
        return this;
    }
}
