import { type Page, expect } from '@playwright/test';

export class SettingsPage {
    constructor(readonly page: Page) {}

    async goto() {
        await this.page.goto('/settings');
        await this.page.waitForURL('/settings');
        await this.page.waitForLoadState('networkidle');
        return this;
    }

    // --- People ---

    async addPerson(name: string) {
        await this.page.getByTestId('add-person-btn').click();
        await this.page.getByTestId('add-person-input').fill(name);
        await this.page.getByTestId('add-person-submit').click();
        await this.page.waitForLoadState('networkidle');
        return this;
    }

    async deletePerson(name: string) {
        const personItem = this.page
            .getByTestId('person-item')
            .filter({ hasText: name });
        await personItem.getByTestId('person-delete-btn').click();
        await this.page.getByTestId('confirm-ok').click();
        await this.page.waitForLoadState('networkidle');
        return this;
    }

    async expectPersonInList(name: string) {
        await expect(
            this.page.getByTestId('person-item').filter({ hasText: name })
        ).toBeVisible();
        return this;
    }

    // --- Categories ---

    async addCategory(label: string) {
        await this.page.getByTestId('add-category-btn').click();
        await this.page.getByTestId('add-category-input').fill(label);
        await this.page.getByTestId('add-category-submit').click();
        await this.page.waitForLoadState('networkidle');
        return this;
    }

    async deleteCategory(label: string) {
        const categoryItem = this.page
            .getByTestId('category-item')
            .filter({ hasText: label });
        await categoryItem.getByTestId('category-delete-btn').click();
        await this.page.getByTestId('confirm-ok').click();
        await this.page.waitForLoadState('networkidle');
        return this;
    }

    async expectCategoryInList(label: string) {
        await expect(
            this.page.getByTestId('category-item').filter({ hasText: label })
        ).toBeVisible();
        return this;
    }

    async expectCategoryNotInList(label: string) {
        await expect(
            this.page.getByTestId('category-item').filter({ hasText: label })
        ).toHaveCount(0);
        return this;
    }

    // --- Currency ---

    async setCurrency(currency: string) {
        // CustomSelect exposes stable test ids (class names are hashed by CSS Modules):
        // trigger = testId, each option = `${testId}-option`.
        await this.page.getByTestId('setting-currency').click();
        await this.page
            .getByTestId('setting-currency-option')
            .filter({ hasText: currency })
            .first()
            .click();
        await this.page.waitForLoadState('networkidle');
        return this;
    }

    // --- Backup / Restore ---

    async downloadBackup() {
        const [download] = await Promise.all([
            this.page.waitForEvent('download'),
            this.page.getByTestId('backup-download-btn').click(),
        ]);
        return download;
    }

    async clickRestoreData() {
        await this.page.getByTestId('restore-data-btn').click();
        return this;
    }

    async restoreBackupFile(filePath: string) {
        await this.clickRestoreData();
        await this.page.getByTestId('restore-file-input').setInputFiles(filePath);
        await this.page.waitForLoadState('networkidle');
        return this;
    }

    // --- Security ---

    async logout() {
        await this.page.getByTestId('logout-btn').click();
        // App renders login form in-place without URL change
        await this.page.getByTestId('login-form').waitFor({ state: 'visible' });
        return this;
    }

    async changePassword(currentPw: string, newPw: string) {
        await this.page.getByTestId('change-password-btn').click();
        await this.page.getByTestId('current-password-input').fill(currentPw);
        await this.page.getByTestId('new-password-input').fill(newPw);
        await this.page.getByTestId('confirm-new-password-input').fill(newPw);
        await this.page.getByTestId('save-password-btn').click();
        await this.page.waitForLoadState('networkidle');
        return this;
    }
}
