import { type Page, expect } from '@playwright/test';

export class HeatmapPage {
    constructor(private page: Page) {}

    async goto() {
        await this.page.goto('/heatmap');
        await this.page.waitForURL('/heatmap');
        await this.page.waitForLoadState('networkidle');
        return this;
    }

    get heatmapGrid() { return this.page.getByTestId('heatmap-grid'); }

    async expectGridVisible() {
        await expect(this.heatmapGrid).toBeVisible();
        return this;
    }
}
