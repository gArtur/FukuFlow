import type { Asset } from '../types';

/** A flattened, display-ready view of an asset used by the Table view. */
export interface AssetRow {
    asset: Asset;
    name: string;
    categoryLabel: string;
    ownerName: string;
    invested: number;
    value: number;
    gain: number;
    gainPercent: number;
    isPositive: boolean;
}

export type AssetSortColumn =
    | 'name'
    | 'category'
    | 'owner'
    | 'invested'
    | 'value'
    | 'gain'
    | 'gainPercent';

export type SortDirection = 'asc' | 'desc';

const COLUMN_KEY: Record<AssetSortColumn, keyof AssetRow> = {
    name: 'name',
    category: 'categoryLabel',
    owner: 'ownerName',
    invested: 'invested',
    value: 'value',
    gain: 'gain',
    gainPercent: 'gainPercent',
};

const NUMERIC_COLUMNS: ReadonlySet<AssetSortColumn> = new Set<AssetSortColumn>([
    'invested',
    'value',
    'gain',
    'gainPercent',
]);

/**
 * Sensible first-click direction: numeric columns descend (largest first, the
 * usual intent when scanning value/gain), text columns ascend (A→Z).
 */
export function getDefaultSortDirection(column: AssetSortColumn): SortDirection {
    return NUMERIC_COLUMNS.has(column) ? 'desc' : 'asc';
}

/** Returns a new array of rows sorted by the given column/direction. Does not mutate input. */
export function sortAssetRows(
    rows: AssetRow[],
    column: AssetSortColumn,
    direction: SortDirection
): AssetRow[] {
    const key = COLUMN_KEY[column];
    const factor = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        let cmp: number;
        if (typeof av === 'number' && typeof bv === 'number') {
            cmp = av - bv;
        } else {
            cmp = String(av).localeCompare(String(bv));
        }
        return cmp * factor;
    });
}
