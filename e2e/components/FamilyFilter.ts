import { type Page, expect } from '@playwright/test';

export class FamilyFilter {
    constructor(private page: Page) {}

    get container() { return this.page.getByTestId('family-filter'); }

    async clickAll() {
        await this.page.getByTestId('filter-all').click();
        return this;
    }

    async clickPerson(name: string) {
        await this.container.getByText(name, { exact: true }).click();
        return this;
    }

    async expectFilterButton(name: string) {
        await expect(this.container.getByText(name, { exact: true })).toBeVisible();
        return this;
    }
}
