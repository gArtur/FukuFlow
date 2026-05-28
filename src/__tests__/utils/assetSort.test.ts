import { describe, it, expect } from 'vitest';
import { sortAssetRows, getDefaultSortDirection } from '../../utils/assetSort';
import type { AssetRow } from '../../utils/assetSort';
import type { Asset } from '../../types';

function makeRow(over: Partial<AssetRow> & { name: string }): AssetRow {
    const asset = { id: over.name, name: over.name } as Asset;
    return {
        asset,
        name: over.name,
        categoryLabel: over.categoryLabel ?? 'ETFs',
        ownerName: over.ownerName ?? 'Me',
        invested: over.invested ?? 0,
        value: over.value ?? 0,
        gain: over.gain ?? 0,
        gainPercent: over.gainPercent ?? 0,
        isPositive: (over.gain ?? 0) >= 0,
    };
}

const names = (rows: AssetRow[]) => rows.map(r => r.name);

describe('sortAssetRows', () => {
    it('sorts by name ascending', () => {
        const rows = [
            makeRow({ name: 'Charlie' }),
            makeRow({ name: 'Alice' }),
            makeRow({ name: 'Bob' }),
        ];
        expect(names(sortAssetRows(rows, 'name', 'asc'))).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts by name descending', () => {
        const rows = [
            makeRow({ name: 'Alice' }),
            makeRow({ name: 'Charlie' }),
            makeRow({ name: 'Bob' }),
        ];
        expect(names(sortAssetRows(rows, 'name', 'desc'))).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('sorts numeric columns numerically, not lexicographically (9 < 10)', () => {
        const rows = [
            makeRow({ name: 'ten', value: 10 }),
            makeRow({ name: 'nine', value: 9 }),
            makeRow({ name: 'hundred', value: 100 }),
        ];
        expect(names(sortAssetRows(rows, 'value', 'asc'))).toEqual(['nine', 'ten', 'hundred']);
        expect(names(sortAssetRows(rows, 'value', 'desc'))).toEqual(['hundred', 'ten', 'nine']);
    });

    it('sorts by gainPercent numerically including negatives', () => {
        const rows = [
            makeRow({ name: 'a', gainPercent: 5 }),
            makeRow({ name: 'b', gainPercent: -12 }),
            makeRow({ name: 'c', gainPercent: 20 }),
        ];
        expect(names(sortAssetRows(rows, 'gainPercent', 'desc'))).toEqual(['c', 'a', 'b']);
    });

    it('does not mutate the input array', () => {
        const rows = [makeRow({ name: 'B' }), makeRow({ name: 'A' })];
        const before = names(rows);
        sortAssetRows(rows, 'name', 'asc');
        expect(names(rows)).toEqual(before);
    });
});

describe('getDefaultSortDirection', () => {
    it('ascends for text columns', () => {
        expect(getDefaultSortDirection('name')).toBe('asc');
        expect(getDefaultSortDirection('category')).toBe('asc');
        expect(getDefaultSortDirection('owner')).toBe('asc');
    });

    it('descends for numeric columns (largest first)', () => {
        expect(getDefaultSortDirection('value')).toBe('desc');
        expect(getDefaultSortDirection('invested')).toBe('desc');
        expect(getDefaultSortDirection('gain')).toBe('desc');
        expect(getDefaultSortDirection('gainPercent')).toBe('desc');
    });
});
