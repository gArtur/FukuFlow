import type { Asset } from '../types';

export interface PerformanceDatum {
    date: string;
    value: number;
    invested: number;
}

export interface PerformanceStats {
    history: PerformanceDatum[];
    startValue: number;
    startInvested: number;
    currentValue: number;
    currentInvested: number;
    calculatedGain: number;
    gainPercent: number;
}

export function calculatePerformance(
    assets: Asset[],
    startDate: Date,
    endDate: Date,
    includeStartInTimeline: boolean = true
): PerformanceStats {
    if (assets.length === 0) {
        return {
            history: [],
            startValue: 0,
            startInvested: 0,
            currentValue: 0,
            currentInvested: 0,
            calculatedGain: 0,
            gainPercent: 0,
        };
    }

    const processedAssets = assets.map(asset => {
        const history = asset.valueHistory || [];
        const sortedHistory = [...history]
            .map(e => ({
                ...e,
                dateStr: e.date.split('T')[0],
            }))
            .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

        let runningInvested = 0;
        const withRunningTotals = sortedHistory.map(entry => {
            runningInvested += entry.investmentChange || 0;
            return { ...entry, runningInvested };
        });

        return { sortedHistory: withRunningTotals };
    });

    const allDates = new Set<string>();
    const nowStr = new Date().toISOString().split('T')[0];
    allDates.add(nowStr);

    // Add all snapshot dates
    assets.forEach(asset => {
        (asset.valueHistory || []).forEach(entry => {
            allDates.add(entry.date.split('T')[0]);
        });
    });

    const startDateStr = startDate.toISOString().split('T')[0];
    if (includeStartInTimeline) {
        allDates.add(startDateStr);
    }

    const sortedDates = Array.from(allDates).sort();
    const filteredDates = sortedDates.filter(d => {
        const dateObj = new Date(d);
        return dateObj >= startDate && dateObj <= endDate;
    });

    const findLatestEntryIndex = (history: { dateStr: string }[], targetDate: string): number => {
        let left = 0,
            right = history.length - 1,
            result = -1;
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (history[mid].dateStr <= targetDate) {
                result = mid;
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return result;
    };

    const historyTimeline = filteredDates.map(date => {
        let totalValue = 0;
        let totalInvested = 0;

        processedAssets.forEach(({ sortedHistory }) => {
            const idx = findLatestEntryIndex(sortedHistory, date);
            if (idx >= 0) {
                totalValue += sortedHistory[idx].value;
                totalInvested += sortedHistory[idx].runningInvested;
            }
        });

        return { date, value: totalValue, invested: totalInvested };
    });

    const currentValue =
        historyTimeline.length > 0 ? historyTimeline[historyTimeline.length - 1].value : 0;
    const currentInvested =
        historyTimeline.length > 0 ? historyTimeline[historyTimeline.length - 1].invested : 0;
    const startValue = historyTimeline.length > 0 ? historyTimeline[0].value : 0;
    const startInvested = historyTimeline.length > 0 ? historyTimeline[0].invested : 0;

    const startTotalGain = startValue - startInvested;
    const endTotalGain = currentValue - currentInvested;
    const calculatedGain = endTotalGain - startTotalGain;

    const investedChange = currentInvested - startInvested;
    const averageCapital = startValue + investedChange;

    const gainPercent = averageCapital > 0 ? (calculatedGain / averageCapital) * 100 : 0;

    return {
        history: historyTimeline,
        startValue,
        startInvested,
        currentValue,
        currentInvested,
        calculatedGain,
        gainPercent,
    };
}

// Per-date cumulative return as a percentage of invested capital (simple ROI).
// See docs/adr/0001-performance-view-uses-simple-roi.md. When no capital has been
// deployed yet (invested <= 0) the return is 0%, so the line sits on the baseline.
export function toPerformanceSeries(history: PerformanceDatum[]): number[] {
    return history.map(({ value, invested }) =>
        invested > 0 ? ((value - invested) / invested) * 100 : 0
    );
}

export function calculateCAGR(history: PerformanceDatum[], gainPercent: number): number {
    if (history.length < 2) return 0;
    const ms =
        new Date(history[history.length - 1].date).getTime() - new Date(history[0].date).getTime();
    const years = ms / (365.25 * 24 * 60 * 60 * 1000);
    if (years < 0.1) return gainPercent;
    // Annualise the already cash-flow-adjusted gainPercent (Modified Dietz return).
    // Using raw endValue/startValue would inflate CAGR by treating deposits as returns.
    return (Math.pow(1 + gainPercent / 100, 1 / years) - 1) * 100;
}

// Resample PerformanceDatum[] to monthly cash-flow-adjusted sub-period returns (%).
// Matches the heatmap formula: basis = prevValue + cashFlow, return = (value - basis) / basis.
function monthlyMarketReturns(history: PerformanceDatum[]): number[] {
    if (history.length < 2) return [];

    const monthlyMap = new Map<string, { value: number; invested: number }>();
    for (const point of history) {
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
        if (basis > 0) returns.push(((curr.value - basis) / basis) * 100);
    }
    return returns;
}

export function calculateMaxDrawdown(history: PerformanceDatum[]): number | null {
    if (history.length < 2) return null;
    const returns = monthlyMarketReturns(history);
    if (returns.length === 0) return null;

    // Build a wealth index from cash-flow-adjusted returns, then find peak-to-trough.
    let peak = 1;
    let wealth = 1;
    let maxDD = 0;
    for (const r of returns) {
        wealth *= 1 + r / 100;
        if (wealth > peak) peak = wealth;
        const dd = ((wealth - peak) / peak) * 100;
        if (dd < maxDD) maxDD = dd;
    }
    return maxDD;
}

export function calculateVolatilityFromHistory(history: PerformanceDatum[]): number {
    const returns = monthlyMarketReturns(history);
    if (returns.length === 0) return 0;
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
}
