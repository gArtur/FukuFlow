import { useMemo } from 'react';
import type { Asset, TimeRange } from '../types';
import { computeAssetGain, type AssetGain } from '../utils/assetGain';
import { getDateRangeFromTimeRange } from '../utils/dateUtils';
import { calculatePerformance, type PerformanceStats } from '../utils/performance';

/** The active range (and follow-general flag) that performance is computed over. */
export interface PerformanceWindow {
    /** When true and a bounded range is active, per-asset gains rebase to that window. */
    assetsFollowGeneral?: boolean;
    timeRange?: TimeRange;
    customStartDate?: string;
    customEndDate?: string;
}

export interface PortfolioPerformance {
    /** Per-asset gain over the active window - identical to computeAssetGain(asset, window). */
    getAssetGain: (asset: Asset) => AssetGain;
    /** Portfolio performance series over the active window, as the Total Worth chart plots it. */
    portfolio: PerformanceStats;
}

/**
 * Compute portfolio performance once per (assets, window) and share it.
 *
 * The asset cards, the table, and the Total Worth chart all need the same
 * window-relative numbers; without this they each call calculatePerformance
 * independently (N+1 passes per render). This memoizes a per-asset gain lookup
 * and the portfolio series so a single computation feeds every consumer. The
 * underlying math stays in computeAssetGain / calculatePerformance.
 */
export function usePortfolioPerformance(
    assets: Asset[],
    window: PerformanceWindow
): PortfolioPerformance {
    const { assetsFollowGeneral, timeRange, customStartDate, customEndDate } = window;

    return useMemo(() => {
        const options = { assetsFollowGeneral, timeRange, customStartDate, customEndDate };

        const gains = new Map<string, AssetGain>();
        for (const asset of assets) {
            gains.set(asset.id, computeAssetGain(asset, options));
        }

        const { startDate, endDate } = getDateRangeFromTimeRange(
            timeRange ?? 'MAX',
            customStartDate,
            customEndDate
        );
        const portfolio = calculatePerformance(assets, startDate, endDate, timeRange !== 'MAX');

        return {
            getAssetGain: (asset: Asset) => gains.get(asset.id) ?? computeAssetGain(asset, options),
            portfolio,
        };
    }, [assets, assetsFollowGeneral, timeRange, customStartDate, customEndDate]);
}
