import { type Page, expect } from '@playwright/test';
import { AddSnapshotModal } from '../components/AddSnapshotModal';
import { EditSnapshotModal } from '../components/EditSnapshotModal';

export class AssetDetailPage {
    readonly addSnapshotModal: AddSnapshotModal;
    readonly editSnapshotModal: EditSnapshotModal;

    constructor(readonly page: Page) {
        this.addSnapshotModal = new AddSnapshotModal(page);
        this.editSnapshotModal = new EditSnapshotModal(page);
    }

    // Desktop viewport: use the header button (FAB is display:none above 1024px)
    get addSnapshotBtn() { return this.page.getByTestId('add-snapshot-btn'); }
    get deleteBtn()      { return this.page.getByTestId('asset-delete-btn'); }
    get editBtn()        { return this.page.getByTestId('asset-edit-btn'); }
    get snapshotRows()   { return this.page.getByTestId('snapshot-row-edit'); }

    async goto(ownerSlug: string, assetSlug: string) {
        await this.page.goto(`/${ownerSlug}/${assetSlug}`);
        await this.page.waitForLoadState('networkidle');
    }

    async expectUrl(ownerSlug: string, assetSlug: string) {
        await expect(this.page).toHaveURL(new RegExp(`/${ownerSlug}/${assetSlug}`));
        return this;
    }

    async openAddSnapshot() {
        await this.addSnapshotBtn.click();
        await expect(this.page.getByTestId('add-snapshot-modal')).toBeVisible();
        return this.addSnapshotModal;
    }

    async editFirstSnapshot() {
        await this.page.getByTestId('snapshot-row-edit').first().click();
        await expect(this.page.getByTestId('edit-snapshot-modal')).toBeVisible();
        return this.editSnapshotModal;
    }

    async deleteAsset() {
        await this.deleteBtn.click();
        await this.page.getByTestId('confirm-ok').click();
        await this.page.waitForURL('/');
    }

    async expectSnapshotCount(count: number) {
        await expect(this.snapshotRows).toHaveCount(count);
        return this;
    }

    async expectSnapshotTableEmpty() {
        await expect(this.snapshotRows).toHaveCount(0);
        return this;
    }
}
