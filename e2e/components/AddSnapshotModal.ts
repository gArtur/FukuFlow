import { type Page, expect } from '@playwright/test';

export class AddSnapshotModal {
    constructor(private page: Page) {}

    get modal()      { return this.page.getByTestId('add-snapshot-modal'); }
    get dateInput()  { return this.page.getByTestId('snapshot-date'); }
    get valueInput() { return this.page.getByTestId('snapshot-value'); }
    get submitBtn()  { return this.page.getByTestId('snapshot-submit'); }

    async fill({ value, date }: { value: string; date: string }) {
        await this.dateInput.fill(date);
        await this.valueInput.fill(value);
        return this;
    }

    async submit() {
        await this.submitBtn.click();
        await expect(this.modal).toBeHidden({ timeout: 5000 });
        return this;
    }
}
