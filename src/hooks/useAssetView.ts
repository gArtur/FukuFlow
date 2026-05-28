import { useState } from 'react';
import {
    getDefaultSortDirection,
    type AssetSortColumn,
    type SortDirection,
} from '../utils/assetSort';

export type AssetViewMode = 'cards' | 'table';

const VIEW_KEY = 'assetView';
const SORT_BY_KEY = 'assetSortBy';
const SORT_DIR_KEY = 'assetSortDir';

const DEFAULT_VIEW: AssetViewMode = 'cards';
const DEFAULT_SORT_BY: AssetSortColumn = 'name';
const DEFAULT_SORT_DIR: SortDirection = 'asc';

const SORT_COLUMNS: AssetSortColumn[] = [
    'name',
    'category',
    'owner',
    'invested',
    'value',
    'gain',
    'gainPercent',
];

export interface UseAssetView {
    view: AssetViewMode;
    setView: (view: AssetViewMode) => void;
    sortBy: AssetSortColumn;
    sortDir: SortDirection;
    /** Toggle direction when re-selecting the active column, else select it with its default direction. */
    setSort: (column: AssetSortColumn) => void;
}

/**
 * localStorage-backed view + sort selection for the My Assets section, mirroring
 * useChartView. Remembers the chosen view (cards/table) and the table's sort
 * column/direction across sessions.
 */
export function useAssetView(): UseAssetView {
    const [view, setViewState] = useState<AssetViewMode>(() => {
        const saved = localStorage.getItem(VIEW_KEY);
        return saved === 'cards' || saved === 'table' ? saved : DEFAULT_VIEW;
    });

    const [sortBy, setSortBy] = useState<AssetSortColumn>(() => {
        const saved = localStorage.getItem(SORT_BY_KEY) as AssetSortColumn | null;
        return saved && SORT_COLUMNS.includes(saved) ? saved : DEFAULT_SORT_BY;
    });

    const [sortDir, setSortDir] = useState<SortDirection>(() => {
        const saved = localStorage.getItem(SORT_DIR_KEY);
        return saved === 'asc' || saved === 'desc' ? saved : DEFAULT_SORT_DIR;
    });

    const setView = (next: AssetViewMode) => {
        localStorage.setItem(VIEW_KEY, next);
        setViewState(next);
    };

    const setSort = (column: AssetSortColumn) => {
        const nextDir: SortDirection =
            column === sortBy
                ? sortDir === 'asc'
                    ? 'desc'
                    : 'asc'
                : getDefaultSortDirection(column);
        localStorage.setItem(SORT_BY_KEY, column);
        localStorage.setItem(SORT_DIR_KEY, nextDir);
        setSortBy(column);
        setSortDir(nextDir);
    };

    return { view, setView, sortBy, sortDir, setSort };
}
