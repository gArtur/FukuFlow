import type { PerformanceDatum } from './performance';

/**
 * Calculates the cash-flow-adjusted change and return percentage over a single sub-period.
 *
 * change = endValue − (startValue + netFlow)
 * returnPercent = change / basis * 100, guarded to 0% when basis ≤ 0 (ADR-0001)
 */
export function subPeriodReturn(
    startValue: number,
    endValue: number,
    netFlow: number
): { change: number; returnPercent: number } {
    const change = endValue - (startValue + netFlow);
    const basis = startValue + netFlow;
    const returnPercent = basis > 0 ? (change / basis) * 100 : 0;
    return { change, returnPercent };
}

/**
 * Resamples PerformanceDatum[] to one sub-period return per calendar month.
 * Uses last point per YYYY-MM, and only pairs consecutive months that exist consecutively.
 * Returns [] for empty or single-point history.
 */
export function monthlyReturns(history: PerformanceDatum[]): number[] {
    if (history.length < 2) return [];

    // Ensure history is chronologically ordered to protect against unsorted inputs
    const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b));

    const monthlyMap = new Map<string, { value: number; invested: number }>();
    for (const point of sortedHistory) {
        // Dedup to the last point per month
        monthlyMap.set(point.date.slice(0, 7), { value: point.value, invested: point.invested });
    }

    const monthly = [...monthlyMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v);

    const returns: number[] = [];
    for (let i = 1; i < monthly.length; i++) {
        const prev = monthly[i - 1];
        const curr = monthly[i];
        const cashFlow = curr.invested - prev.invested;
        const basis = prev.value + cashFlow;
        // The volatility and max drawdown formulas expect return only if basis > 0.
        // If basis <= 0, we skip/exclude it from the returns array, matching old monthlyMarketReturns.
        if (basis > 0) {
            const { returnPercent } = subPeriodReturn(prev.value, curr.value, cashFlow);
            returns.push(returnPercent);
        }
    }
    return returns;
}
