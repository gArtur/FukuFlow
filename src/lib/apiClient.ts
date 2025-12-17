const API_URL = 'http://localhost:3001/api';

export interface SnapshotData {
    value: number;
    date?: string;
    investmentChange?: number;
    notes?: string;
}

export const ApiClient = {
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

    async deletePerson(id: string) {
        await fetch(`${API_URL}/persons/${id}`, { method: 'DELETE' });
    },

    async getAssets() {
        const response = await fetch(`${API_URL}/assets`);
        return response.json();
    },

    async addAsset(asset: any) {
        const response = await fetch(`${API_URL}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(asset)
        });
        return response.json();
    },

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
