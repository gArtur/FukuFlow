const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface SnapshotData {
    value: number;
    date?: string;
    investmentChange?: number;
    notes?: string;
}

export const ApiClient = {


    async getSettings() {
        const response = await fetch(`${API_URL}/settings`);
        if (!response.ok) {
            if (response.status === 404) return null; // Backend might not have this endpoint yet
            throw new Error(`Failed to fetch settings: ${response.statusText}`);
        }
        return response.json();
    },

    async updateSetting(key: string, value: string) {
        const response = await fetch(`${API_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        });
        if (!response.ok) throw new Error(`Failed to update setting: ${response.statusText}`);
        return response.json();
    },

    async getCategories() {
        const response = await fetch(`${API_URL}/categories`);
        if (!response.ok) {
            if (response.status === 404) return []; // Backend might not have this endpoint yet
            throw new Error(`Failed to fetch categories: ${response.statusText}`);
        }
        return response.json();
    },

    async addCategory(label: string, color: string) {
        const response = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, color })
        });
        return response.json();
    },

    async updateCategory(id: string, label: string, color: string) {
        const response = await fetch(`${API_URL}/categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, color })
        });
        return response.json();
    },

    async deleteCategory(id: string) {
        const response = await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete category');
        }
    },

    async getBackup() {
        const response = await fetch(`${API_URL}/backup`);
        return response.blob();
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async restoreBackup(backupData: any) {
        const response = await fetch(`${API_URL}/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backupData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Restore failed');
        }
        return response.json();
    },

    async getPersons() {
        const response = await fetch(`${API_URL}/persons`);
        return response.json();
    },

    async addPerson(name: string) {
        const response = await fetch(`${API_URL}/persons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        return response.json();
    },

    async updatePerson(id: string, data: { name?: string, displayOrder?: number }) {
        const response = await fetch(`${API_URL}/persons/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async reorderPersons(ids: string[]) {
        const response = await fetch(`${API_URL}/persons/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        return response.json();
    },

    async deletePerson(id: string) {
        await fetch(`${API_URL}/persons/${id}`, { method: 'DELETE' });
    },

    async getAssets() {
        const response = await fetch(`${API_URL}/assets`);
        return response.json();
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async addAsset(asset: any) {
        const response = await fetch(`${API_URL}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(asset)
        });
        return response.json();
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async updateAsset(id: string, updates: any) {
        const response = await fetch(`${API_URL}/assets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        return response.json();
    },

    async addSnapshot(id: string, snapshot: SnapshotData) {
        const response = await fetch(`${API_URL}/assets/${id}/snapshot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(snapshot)
        });
        return response.json();
    },

    async updateAssetValue(id: string, value: number) {
        const response = await fetch(`${API_URL}/assets/${id}/value`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
        });
        return response.json();
    },

    async deleteAsset(id: string) {
        await fetch(`${API_URL}/assets/${id}`, { method: 'DELETE' });
    },

    async deleteSnapshot(id: number) {
        await fetch(`${API_URL}/snapshots/${id}`, { method: 'DELETE' });
    },

    async updateSnapshot(id: number, data: { date: string; value: number; investmentChange: number; notes: string }) {
        const response = await fetch(`${API_URL}/snapshots/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    }
};
