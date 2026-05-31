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
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * Error thrown by the API client for any non-ok HTTP response. Carries the HTTP
 * `status` so callers can branch on it without re-parsing the response.
 */
export class ApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/**
 * Make an authenticated fetch request
 */
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
        ...getAuthHeaders(),
        ...(options.headers || {}),
    };

    const response = await fetch(url, { ...options, headers });

    // Handle 401 by clearing token (will trigger re-auth)
    if (response.status === 401) {
        localStorage.removeItem('auth_token');
    }

    return response;
}

/**
 * Map a non-ok response to an ApiError. Prefers the server-provided `{ error }`
 * message, falling back to the status text or a generic status message.
 */
async function toApiError(response: Response): Promise<ApiError> {
    let message = response.statusText || `Request failed with status ${response.status}`;
    try {
        const body = await response.json();
        if (body && typeof body.error === 'string') {
            message = body.error;
        }
    } catch {
        // Body was empty or not JSON; keep the status-based fallback message.
    }
    return new ApiError(message, response.status);
}

/**
 * Parse a successful response body. Returns `undefined` for empty / 204
 * responses so callers don't have to special-case them.
 */
async function parseBody<T>(response: Response): Promise<T | undefined> {
    if (response.status === 204) return undefined;
    const text = await response.text();
    if (!text) return undefined;
    return JSON.parse(text) as T;
}

/**
 * The single error/return contract for every endpoint: throws an ApiError on any
 * non-ok response (mapping status to message in one place), otherwise returns the
 * parsed JSON body (or `undefined` for empty responses).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await authFetch(url, options);
    if (!response.ok) {
        throw await toApiError(response);
    }
    return (await parseBody<T>(response)) as T;
}

export const ApiClient = {
    // ============================================
    // AUTH ENDPOINTS
    // ============================================

    async getAuthStatus() {
        return request(`${API_URL}/auth/status`);
    },

    async login(password: string) {
        return request(`${API_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
    },

    async setup(password: string) {
        return request(`${API_URL}/auth/setup`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
    },

    async logout() {
        return request(`${API_URL}/auth/logout`, { method: 'POST' });
    },

    async changePassword(currentPassword: string, newPassword: string) {
        return request(`${API_URL}/auth/change-password`, {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },

    // ============================================
    // SETTINGS (protected)
    // ============================================

    async getSettings() {
        return request(`${API_URL}/settings`);
    },

    async updateSetting(key: string, value: string) {
        return request(`${API_URL}/settings`, {
            method: 'POST',
            body: JSON.stringify({ key, value }),
        });
    },

    // ============================================
    // CATEGORIES (protected)
    // ============================================

    async getCategories() {
        return request(`${API_URL}/categories`);
    },

    async addCategory(label: string, color: string) {
        return request(`${API_URL}/categories`, {
            method: 'POST',
            body: JSON.stringify({ label, color }),
        });
    },

    async updateCategory(id: string, label: string, color: string) {
        return request(`${API_URL}/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ label, color }),
        });
    },

    async deleteCategory(id: string) {
        await request(`${API_URL}/categories/${id}`, { method: 'DELETE' });
    },

    // ============================================
    // BACKUP (protected)
    // ============================================

    async getBackup() {
        const response = await authFetch(`${API_URL}/backup`);
        if (!response.ok) {
            throw await toApiError(response);
        }
        return response.blob();
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async restoreBackup(backupData: any) {
        return request(`${API_URL}/backup/restore`, {
            method: 'POST',
            body: JSON.stringify(backupData),
        });
    },

    // ============================================
    // PERSONS (protected)
    // ============================================

    async getPersons() {
        return request(`${API_URL}/persons`);
    },

    async addPerson(name: string) {
        return request(`${API_URL}/persons`, {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    },

    async updatePerson(id: string, data: { name?: string; displayOrder?: number }) {
        return request(`${API_URL}/persons/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async reorderPersons(ids: string[]) {
        return request(`${API_URL}/persons/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ ids }),
        });
    },

    async deletePerson(id: string) {
        await request(`${API_URL}/persons/${id}`, { method: 'DELETE' });
    },

    // ============================================
    // ASSETS (protected)
    // ============================================

    async getAssets() {
        return request(`${API_URL}/assets`);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async addAsset(asset: any) {
        return request(`${API_URL}/assets`, {
            method: 'POST',
            body: JSON.stringify(asset),
        });
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async updateAsset(id: string, updates: any) {
        return request(`${API_URL}/assets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    async addSnapshot(id: string, snapshot: SnapshotData) {
        return request(`${API_URL}/assets/${id}/snapshot`, {
            method: 'POST',
            body: JSON.stringify(snapshot),
        });
    },

    async bulkAddSnapshots(id: string, snapshots: SnapshotData[]) {
        return request(`${API_URL}/assets/${id}/snapshot/bulk`, {
            method: 'POST',
            body: JSON.stringify({ snapshots }),
        });
    },

    async deleteAsset(id: string) {
        await request(`${API_URL}/assets/${id}`, { method: 'DELETE' });
    },

    // ============================================
    // SNAPSHOTS (protected)
    // ============================================

    async deleteSnapshot(id: number) {
        await request(`${API_URL}/snapshots/${id}`, { method: 'DELETE' });
    },

    async updateSnapshot(
        id: number,
        data: { date: string; value: number; investmentChange: number; notes: string }
    ) {
        return request(`${API_URL}/snapshots/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
};
