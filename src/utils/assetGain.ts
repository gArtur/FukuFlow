import type { Asset, TimeRange } from '../types';
import { getDateRangeFromTimeRange } from './dateUtils';
import { calculatePerformance } from './performance';

export interface AssetGainOptions {
    /** When true and a bounded time range is active, gain reflects that period (Modified-Dietz). */
    assetsFollowGeneral?: boolean;
    timeRange?: TimeRange;
    customStartDate?: string;
    customEndDate?: string;
}

export interface AssetGain {
    /** Absolute gain in currency. */
    gain: number;
    /** Gain as a percentage (0 when the capital basis is non-positive). */
    gainPercent: number;
    isPositive: boolean;
    /** Value series for the sparkline (date + value), matching the active window. */
    history: { date: string; value: number }[];
}

/**
 * Single source of truth for an asset's gain/loss, shared by the cards and the table.
 *
 * Defaults to all-time gain (currentValue − purchaseAmount). When `assetsFollowGeneral`
 * is set and a bounded time range is active (anything other than 'MAX'), the gain is
 * rebased to that window using the same money-weighted calculation as the portfolio chart.
 */
export function computeAssetGain(asset: Asset, options: AssetGainOptions = {}): AssetGain {
    const { assetsFollowGeneral, timeRange, customStartDate, customEndDate } = options;

    let gain = asset.currentValue - asset.purchaseAmount;
    let gainPercent = asset.purchaseAmount > 0 ? (gain / asset.purchaseAmount) * 100 : 0;
    let history: { date: string; value: number }[] = (asset.valueHistory || []).map(h => ({
        date: h.date,
        value: h.value,
    }));

    if (assetsFollowGeneral && timeRange && timeRange !== 'MAX') {
        const { startDate, endDate } = getDateRangeFromTimeRange(
            timeRange,
            customStartDate,
            customEndDate
        );
        const perf = calculatePerformance([asset], startDate, endDate, true);
        gain = perf.calculatedGain;
        gainPercent = perf.gainPercent;
        history = perf.history.map(h => ({ date: h.date, value: h.value }));
    }

    return { gain, gainPercent, isPositive: gain >= 0, history };
}
