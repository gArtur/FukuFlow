import { type Page, expect } from '@playwright/test';

export class LoginPage {
    constructor(private page: Page) {}

    async goto() {
        await this.page.goto('/');
    }

    get passwordInput() { return this.page.getByTestId('login-password'); }
    get submitBtn()     { return this.page.getByTestId('login-submit'); }
    get errorMsg()      { return this.page.getByTestId('login-error'); }
    get setupForm()     { return this.page.getByTestId('setup-form'); }

    async login(password: string) {
        await this.goto();
        await this.page.waitForSelector('[data-testid="login-password"]');
        await this.passwordInput.fill(password);
        await this.submitBtn.click();
        return this;
    }

    async setup(password: string) {
        await this.goto();
        await this.page.waitForSelector('[data-testid="setup-password"]');
        await this.page.getByTestId('setup-password').fill(password);
        await this.page.getByTestId('setup-confirm-password').fill(password);
        await this.page.getByTestId('setup-submit').click();
        return this;
    }

    async expectError(text: string) {
        await expect(this.errorMsg).toContainText(text);
        return this;
    }

    async expectOnLoginPage() {
        await expect(this.page.getByTestId('login-form')).toBeVisible();
        return this;
    }

    async expectOnSetupPage() {
        await expect(this.setupForm).toBeVisible();
        return this;
    }
}
