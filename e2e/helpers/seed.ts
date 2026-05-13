import { type APIRequestContext } from '@playwright/test';

const BASE = 'http://localhost:3001';

function authHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
}

export async function getToken(request: APIRequestContext): Promise<string> {
    // Read the stored auth_token from the .auth/state.json via API re-login
    const res = await request.post(`${BASE}/api/auth/login`, {
        data: { password: 'TestPassword1!' },
    });
    const json = await res.json();
    return json.token as string;
}

export async function seedPerson(
    request: APIRequestContext,
    token: string,
    name: string
): Promise<string> {
    const res = await request.post(`${BASE}/api/persons`, {
        data: { name },
        headers: authHeaders(token),
    });
    const json = await res.json();
    return json.id as string;
}

export async function deletePerson(
    request: APIRequestContext,
    token: string,
    id: string
): Promise<void> {
    await request.delete(`${BASE}/api/persons/${id}`, {
        headers: authHeaders(token),
    });
}

export async function seedAsset(
    request: APIRequestContext,
    token: string,
    params: {
        name: string;
        ownerId: string;
        category?: string;
        purchaseAmount?: number;
        currentValue?: number;
    }
): Promise<string> {
    const res = await request.post(`${BASE}/api/assets`, {
        data: {
            name: params.name,
            ownerId: params.ownerId,
            category: params.category ?? 'stocks',
            purchaseDate: '2024-01-01',
            purchaseAmount: params.purchaseAmount ?? 1000,
            currentValue: params.currentValue ?? 1000,
        },
        headers: authHeaders(token),
    });
    const json = await res.json();
    return json.id as string;
}

export async function deleteAsset(
    request: APIRequestContext,
    token: string,
    id: string
): Promise<void> {
    await request.delete(`${BASE}/api/assets/${id}`, {
        headers: authHeaders(token),
    });
}

export async function seedSnapshot(
    request: APIRequestContext,
    token: string,
    assetId: string,
    params: { value: number; date: string; investmentChange?: number; notes?: string }
): Promise<void> {
    await request.post(`${BASE}/api/assets/${assetId}/snapshot`, {
        data: {
            value: params.value,
            date: params.date,
            investmentChange: params.investmentChange ?? 0,
            notes: params.notes ?? '',
        },
        headers: authHeaders(token),
    });
}

export async function seedCategory(
    request: APIRequestContext,
    token: string,
    label: string,
    color = '#10b981'
): Promise<string> {
    const res = await request.post(`${BASE}/api/categories`, {
        data: { label, color },
        headers: authHeaders(token),
    });
    const json = await res.json();
    return json.id as string;
}

export async function deleteCategory(
    request: APIRequestContext,
    token: string,
    id: string
): Promise<void> {
    await request.delete(`${BASE}/api/categories/${id}`, {
        headers: authHeaders(token),
    });
}

export async function getBackupJson(
    request: APIRequestContext,
    token: string
): Promise<object> {
    const res = await request.get(`${BASE}/api/backup`, {
        headers: authHeaders(token),
    });
    return await res.json();
}
