import { type Page, expect } from '@playwright/test';

export class AddAssetModal {
    constructor(private page: Page) {}

    get modal()         { return this.page.getByTestId('add-asset-modal'); }
    get nameInput()     { return this.page.getByTestId('asset-name-input'); }
    get categorySelect(){ return this.page.getByTestId('asset-category-select'); }
    get ownerSelect()   { return this.page.getByTestId('asset-owner-select'); }
    get submitBtn()     { return this.page.getByTestId('add-asset-submit'); }

    async fill({ name, category, owner }: { name: string; category?: string; owner?: string }) {
        await this.nameInput.fill(name);
        if (category) await this.categorySelect.selectOption({ label: category });
        if (owner)    await this.ownerSelect.selectOption({ label: owner });
        return this;
    }

    async submit() {
        await this.submitBtn.click();
        await expect(this.modal).toBeHidden({ timeout: 5000 });
        return this;
    }

    async expectCategoryOption(label: string) {
        await expect(this.categorySelect.locator(`option:text-is("${label}")`)).toBeAttached();
        return this;
    }
}
