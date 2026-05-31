import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient, ApiError } from '../../lib/apiClient';

/**
 * Build a minimal fake Response. `body` is JSON-serialised; pass a string to
 * simulate a non-JSON / empty body.
 */
function fakeResponse(body: unknown, init: { status?: number; ok?: boolean } = {}): Response {
    const status = init.status ?? 200;
    const ok = init.ok ?? (status >= 200 && status < 300);
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    return {
        ok,
        status,
        statusText: '',
        json: async () => {
            if (text === '') throw new SyntaxError('Unexpected end of JSON input');
            return JSON.parse(text);
        },
        text: async () => text,
        blob: async () => new Blob([text]),
    } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('ApiClient unified contract', () => {
    it('throws a typed ApiError carrying the status on a non-ok write response', async () => {
        fetchMock.mockResolvedValueOnce(fakeResponse({ error: 'Boom' }, { status: 500 }));

        const error = await ApiClient.updateAsset('1', { name: 'x' }).catch(e => e);
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ status: 500 });
    });

    it('returns the parsed JSON body on a successful response', async () => {
        const assets = [{ id: '1', name: 'House' }];
        fetchMock.mockResolvedValueOnce(fakeResponse(assets));

        await expect(ApiClient.getAssets()).resolves.toEqual(assets);
    });

    it('uses the server-provided { error } message on failure', async () => {
        fetchMock.mockResolvedValueOnce(
            fakeResponse({ error: 'Name already taken' }, { status: 400 })
        );

        await expect(ApiClient.addPerson('Bob')).rejects.toThrow('Name already taken');
    });

    it('falls back to a status-based message when the body has no error field', async () => {
        fetchMock.mockResolvedValueOnce(fakeResponse('', { status: 503 }));

        await expect(ApiClient.getAssets()).rejects.toThrow('Request failed with status 503');
    });

    it('clears the stored auth token on a 401 response', async () => {
        localStorage.setItem('auth_token', 'stale-token');
        fetchMock.mockResolvedValueOnce(fakeResponse({ error: 'Unauthorized' }, { status: 401 }));

        await expect(ApiClient.getAssets()).rejects.toBeInstanceOf(ApiError);
        expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('attaches the Authorization header when a token is present', async () => {
        localStorage.setItem('auth_token', 'abc123');
        fetchMock.mockResolvedValueOnce(fakeResponse([]));

        await ApiClient.getAssets();

        const [, options] = fetchMock.mock.calls[0];
        expect(options.headers.Authorization).toBe('Bearer abc123');
    });

    it('resolves without throwing for an empty (204) response', async () => {
        fetchMock.mockResolvedValueOnce(fakeResponse('', { status: 204 }));

        await expect(ApiClient.deleteAsset('1')).resolves.toBeUndefined();
    });

    it('throws on a non-ok response from a delete endpoint', async () => {
        fetchMock.mockResolvedValueOnce(fakeResponse({ error: 'Not found' }, { status: 404 }));

        await expect(ApiClient.deleteAsset('1')).rejects.toMatchObject({ status: 404 });
    });

    it('throws (rather than returning null) when getSettings hits a non-ok status', async () => {
        fetchMock.mockResolvedValueOnce(fakeResponse('', { status: 404 }));

        await expect(ApiClient.getSettings()).rejects.toMatchObject({ status: 404 });
    });

    it('returns a Blob from getBackup on success', async () => {
        fetchMock.mockResolvedValueOnce(fakeResponse('db-bytes'));

        await expect(ApiClient.getBackup()).resolves.toBeInstanceOf(Blob);
    });

    it('throws an ApiError from getBackup on a non-ok response', async () => {
        fetchMock.mockResolvedValueOnce(fakeResponse('', { status: 500 }));

        await expect(ApiClient.getBackup()).rejects.toBeInstanceOf(ApiError);
    });
});
