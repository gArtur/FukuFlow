import type { Asset, Person } from '../../types';

export interface HeatmapCell {
    month: string;           // "2024-01", "2024-02", etc.
    value: number;           // Current value
    previousValue: number;   // Previous month value
    change: number;          // Change in currency
    changePercent: number;   // Change percentage
    hasData: boolean;        // Whether this month had actual data
    exists: boolean;         // Whether the asset existed in this month
    isInception: boolean;    // Whether this is the first month of data
    monthlyFlow?: number;    // Investment flow for the month
}

export interface HeatmapRow {
    id: string;
    name: string;
    category: string;
    ownerName: string;
    cells: HeatmapCell[];
    totalChange: number;
    totalChangePercent: number;
    startValue: number;
    endValue: number;
}

export interface TooltipData {
    x: number;
    y: number;
    assetName: string;
    month: string;
    value: number;
    previousValue: number;
    change: number;
    changePercent: number;
    category: string;
    owner: string;
}

export interface PortfolioHeatmapProps {
    assets: Asset[];
    persons: Person[];
}

export type ViewMode = 'percent' | 'value';
export type SortDirection = 'asc' | 'desc' | null;
export type QuickFilter = 'YTD' | '1Y' | '5Y' | 'MAX';
