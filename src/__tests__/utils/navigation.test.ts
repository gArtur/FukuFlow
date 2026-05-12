import { describe, it, expect } from 'vitest';
import { slugify, generateAssetUrl, resolveAssetFromSlug } from '../../utils/navigation';
import type { Asset, Person } from '../../types';

// ─── slugify ─────────────────────────────────────────────────────────────────

describe('slugify', () => {
    it('converts to lowercase', () => {
        expect(slugify('Hello World')).toBe('hello-world');
    });

    it('replaces spaces with hyphens', () => {
        expect(slugify('my asset name')).toBe('my-asset-name');
    });

    it('replaces & with -and-', () => {
        expect(slugify('S&P 500')).toBe('s-and-p-500');
    });

    it('removes special characters other than hyphens and word chars', () => {
        expect(slugify('Asset (123)!')).toBe('asset-123');
    });

    it('collapses multiple hyphens into one', () => {
        expect(slugify('foo  &  bar')).toBe('foo-and-bar');
    });

    it('trims leading hyphens', () => {
        // edge case: string starting with non-word char
        expect(slugify('&start')).toBe('and-start');
    });

    it('trims trailing hyphens', () => {
        expect(slugify('end&')).toBe('end-and');
    });

    it('handles a plain number string', () => {
        expect(slugify('500')).toBe('500');
    });

    it('returns empty string for empty input', () => {
        expect(slugify('')).toBe('');
    });
});

// ─── generateAssetUrl ────────────────────────────────────────────────────────

describe('generateAssetUrl', () => {
    it('produces /ownerSlug/assetSlug', () => {
        expect(generateAssetUrl('Alice', 'My ETF')).toBe('/alice/my-etf');
    });

    it('handles special characters in both names', () => {
        expect(generateAssetUrl('John & Jane', 'S&P 500')).toBe('/john-and-jane/s-and-p-500');
    });
});

// ─── resolveAssetFromSlug ────────────────────────────────────────────────────

const PERSONS: Person[] = [
    { id: 'p1', name: 'Alice', displayOrder: 0 },
    { id: 'p2', name: 'Bob', displayOrder: 1 },
];

const ASSETS: Asset[] = [
    {
        id: 'a1',
        name: 'My ETF',
        category: 'etf',
        ownerId: 'p1',
        purchaseAmount: 1000,
        purchaseDate: '2024-01-01',
        currentValue: 1100,
        valueHistory: [],
    },
    {
        id: 'a2',
        name: 'Tech Stock',
        category: 'stocks',
        ownerId: 'p2',
        purchaseAmount: 500,
        purchaseDate: '2024-01-01',
        currentValue: 600,
        valueHistory: [],
    },
];

describe('resolveAssetFromSlug', () => {
    it('finds the correct asset and person', () => {
        const { asset, person } = resolveAssetFromSlug(ASSETS, PERSONS, 'alice', 'my-etf');
        expect(asset?.id).toBe('a1');
        expect(person?.id).toBe('p1');
    });

    it('returns empty object when owner slug does not match any person', () => {
        const result = resolveAssetFromSlug(ASSETS, PERSONS, 'unknown-owner', 'my-etf');
        expect(result).toEqual({});
    });

    it('returns { person } with undefined asset when asset slug does not match', () => {
        const result = resolveAssetFromSlug(ASSETS, PERSONS, 'alice', 'nonexistent');
        expect(result.person?.id).toBe('p1');
        expect(result.asset).toBeUndefined();
    });

    it('does not confuse assets belonging to different owners', () => {
        // 'tech-stock' belongs to Bob, not Alice
        const result = resolveAssetFromSlug(ASSETS, PERSONS, 'alice', 'tech-stock');
        expect(result.asset).toBeUndefined();
        expect(result.person?.id).toBe('p1');
    });

    it('returns empty object when ownerSlug is undefined', () => {
        const result = resolveAssetFromSlug(ASSETS, PERSONS, undefined, 'my-etf');
        expect(result).toEqual({});
    });

    it('returns empty object when assetSlug is undefined', () => {
        const result = resolveAssetFromSlug(ASSETS, PERSONS, 'alice', undefined);
        expect(result).toEqual({});
    });
});
