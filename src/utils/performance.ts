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

export function calculateCAGR(history: PerformanceDatum[], gainPercent: number): number {
    if (history.length < 2) return 0;
    const startValue = history[0].value;
    if (startValue <= 0) return 0;
    const endValue = history[history.length - 1].value;
    const ms =
        new Date(history[history.length - 1].date).getTime() - new Date(history[0].date).getTime();
    const years = ms / (365.25 * 24 * 60 * 60 * 1000);
    if (years < 0.1) return gainPercent;
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

export function calculateMaxDrawdown(history: PerformanceDatum[]): number | null {
    if (history.length < 2) return null;
    let peak = history[0].value;
    let maxDD = 0;
    for (const point of history) {
        if (point.value > peak) peak = point.value;
        if (peak > 0) {
            const dd = ((point.value - peak) / peak) * 100;
            if (dd < maxDD) maxDD = dd;
        }
    }
    return maxDD;
}

export function calculateVolatilityFromHistory(history: PerformanceDatum[]): number {
    if (history.length < 2) return 0;
    const returns: number[] = [];
    for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1].value;
        if (prev > 0) returns.push(((history[i].value - prev) / prev) * 100);
    }
    if (returns.length === 0) return 0;
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
}
