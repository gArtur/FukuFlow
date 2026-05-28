import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAssetView } from '../../hooks/useAssetView';

beforeEach(() => {
    localStorage.clear();
});

describe('useAssetView', () => {
    it('defaults to the Cards view sorted by name ascending', () => {
        const { result } = renderHook(() => useAssetView());
        expect(result.current.view).toBe('cards');
        expect(result.current.sortBy).toBe('name');
        expect(result.current.sortDir).toBe('asc');
    });

    it('restores a previously saved view and sort on mount', () => {
        localStorage.setItem('assetView', 'table');
        localStorage.setItem('assetSortBy', 'value');
        localStorage.setItem('assetSortDir', 'desc');
        const { result } = renderHook(() => useAssetView());
        expect(result.current.view).toBe('table');
        expect(result.current.sortBy).toBe('value');
        expect(result.current.sortDir).toBe('desc');
    });

    it('persists the view to localStorage when changed', () => {
        const { result } = renderHook(() => useAssetView());
        act(() => result.current.setView('table'));
        expect(result.current.view).toBe('table');
        expect(localStorage.getItem('assetView')).toBe('table');
    });

    it('selecting a new column applies its default direction and persists', () => {
        const { result } = renderHook(() => useAssetView());
        act(() => result.current.setSort('value'));
        expect(result.current.sortBy).toBe('value');
        expect(result.current.sortDir).toBe('desc'); // numeric default
        expect(localStorage.getItem('assetSortBy')).toBe('value');
        expect(localStorage.getItem('assetSortDir')).toBe('desc');
    });

    it('re-selecting the active column flips the direction', () => {
        const { result } = renderHook(() => useAssetView());
        act(() => result.current.setSort('name')); // already active, asc -> desc
        expect(result.current.sortDir).toBe('desc');
        act(() => result.current.setSort('name')); // desc -> asc
        expect(result.current.sortDir).toBe('asc');
    });

    it('ignores unrecognized saved values and falls back to defaults', () => {
        localStorage.setItem('assetView', 'garbage');
        localStorage.setItem('assetSortBy', 'nonsense');
        localStorage.setItem('assetSortDir', 'sideways');
        const { result } = renderHook(() => useAssetView());
        expect(result.current.view).toBe('cards');
        expect(result.current.sortBy).toBe('name');
        expect(result.current.sortDir).toBe('asc');
    });
});
