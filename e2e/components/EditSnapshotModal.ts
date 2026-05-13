import { type Page, expect } from '@playwright/test';

export class EditSnapshotModal {
    constructor(private page: Page) {}

    get modal()     { return this.page.getByTestId('edit-snapshot-modal'); }
    get dateInput() { return this.page.getByTestId('edit-snapshot-date'); }
    get valueInput(){ return this.page.getByTestId('edit-snapshot-value'); }
    get submitBtn() { return this.page.getByTestId('edit-snapshot-submit'); }
    get deleteBtn() { return this.page.getByTestId('edit-snapshot-delete-btn'); }

    async updateValue(value: string) {
        await this.valueInput.fill(value);
        await this.submitBtn.click();
        await expect(this.modal).toBeHidden({ timeout: 5000 });
        return this;
    }

    async delete() {
        await this.deleteBtn.click();
        // Confirmation modal appears — confirm it
        await this.page.getByTestId('confirm-ok').click();
        await expect(this.modal).toBeHidden({ timeout: 5000 });
        return this;
    }
}
