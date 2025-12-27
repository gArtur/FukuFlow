const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface SnapshotData {
    value: number;
    date?: string;
    investmentChange?: number;
    notes?: string;
}

/**
 * Get auth headers if token exists
 */
function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * Make an authenticated fetch request
 */
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
        ...getAuthHeaders(),
        ...(options.headers || {})
    };

    const response = await fetch(url, { ...options, headers });

    // Handle 401 by clearing token (will trigger re-auth)
    if (response.status === 401) {
        localStorage.removeItem('auth_token');
    }

    return response;
}

export const ApiClient = {
    // ============================================
    // AUTH ENDPOINTS (no auth required)
    // ============================================

    async getAuthStatus() {
        const response = await fetch(`${API_URL}/auth/status`);
        if (!response.ok) throw new Error('Failed to check auth status');
        return response.json();
    },

    async login(password: string) {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }
        return response.json();
    },

    async setup(password: string) {
        const response = await fetch(`${API_URL}/auth/setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Setup failed');
        }
        return response.json();
    },

    async logout() {
        const response = await authFetch(`${API_URL}/auth/logout`, { method: 'POST' });
        return response.json();
    },

    async changePassword(currentPassword: string, newPassword: string) {
        const response = await authFetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Password change failed');
        }
        return response.json();
    },

    // ============================================
    // SETTINGS (protected)
    // ============================================

    async getSettings() {
        const response = await authFetch(`${API_URL}/settings`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Failed to fetch settings: ${response.statusText}`);
        }
        return response.json();
    },

    async updateSetting(key: string, value: string) {
        const response = await authFetch(`${API_URL}/settings`, {
            method: 'POST',
            body: JSON.stringify({ key, value })
        });
        if (!response.ok) throw new Error(`Failed to update setting: ${response.statusText}`);
        return response.json();
    },

    // ============================================
    // CATEGORIES (protected)
    // ============================================

    async getCategories() {
        const response = await authFetch(`${API_URL}/categories`);
        if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`Failed to fetch categories: ${response.statusText}`);
        }
        return response.json();
    },

    async addCategory(label: string, color: string) {
        const response = await authFetch(`${API_URL}/categories`, {
            method: 'POST',
            body: JSON.stringify({ label, color })
        });
        return response.json();
    },

    async updateCategory(id: string, label: string, color: string) {
        const response = await authFetch(`${API_URL}/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ label, color })
        });
        return response.json();
    },

    async deleteCategory(id: string) {
        const response = await authFetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete category');
        }
    },

    // ============================================
    // BACKUP (protected)
    // ============================================

    async getBackup() {
        const response = await authFetch(`${API_URL}/backup`);
        return response.blob();
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async restoreBackup(backupData: any) {
        const response = await authFetch(`${API_URL}/backup/restore`, {
            method: 'POST',
            body: JSON.stringify(backupData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Restore failed');
        }
        return response.json();
    },

    // ============================================
    // PERSONS (protected)
    // ============================================

    async getPersons() {
        const response = await authFetch(`${API_URL}/persons`);
        if (!response.ok) {
            throw new Error(`Failed to fetch persons: ${response.statusText}`);
        }
        return response.json();
    },

    async addPerson(name: string) {
        const response = await authFetch(`${API_URL}/persons`, {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add person');
        }
        return response.json();
    },

    async updatePerson(id: string, data: { name?: string, displayOrder?: number }) {
        const response = await authFetch(`${API_URL}/persons/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async reorderPersons(ids: string[]) {
        const response = await authFetch(`${API_URL}/persons/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ ids })
        });
        return response.json();
    },

    async deletePerson(id: string) {
        await authFetch(`${API_URL}/persons/${id}`, { method: 'DELETE' });
    },

    // ============================================
    // ASSETS (protected)
    // ============================================

    async getAssets() {
        const response = await authFetch(`${API_URL}/assets`);
        if (!response.ok) {
            throw new Error(`Failed to fetch assets: ${response.statusText}`);
        }
        return response.json();
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async addAsset(asset: any) {
        const response = await authFetch(`${API_URL}/assets`, {
            method: 'POST',
            body: JSON.stringify(asset)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add asset');
        }
        return response.json();
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async updateAsset(id: string, updates: any) {
        const response = await authFetch(`${API_URL}/assets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        return response.json();
    },

    async addSnapshot(id: string, snapshot: SnapshotData) {
        const response = await authFetch(`${API_URL}/assets/${id}/snapshot`, {
            method: 'POST',
            body: JSON.stringify(snapshot)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add snapshot');
        }
        return response.json();
    },

    async updateAssetValue(id: string, value: number) {
        const response = await authFetch(`${API_URL}/assets/${id}/value`, {
            method: 'POST',
            body: JSON.stringify({ value })
        });
        return response.json();
    },

    async deleteAsset(id: string) {
        await authFetch(`${API_URL}/assets/${id}`, { method: 'DELETE' });
    },

    // ============================================
    // SNAPSHOTS (protected)
    // ============================================

    async deleteSnapshot(id: number) {
        await authFetch(`${API_URL}/snapshots/${id}`, { method: 'DELETE' });
    },

    async updateSnapshot(id: number, data: { date: string; value: number; investmentChange: number; notes: string }) {
        const response = await authFetch(`${API_URL}/snapshots/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.json();
    }
};
