import type { Asset } from '../types';
import { generateMonthRange } from './dateUtils';

export interface HeatmapCell {
    month: string;
    value: number;
    previousValue: number;
    changePercent: number;
    changeValue: number;
    hasData: boolean;
}

export interface HeatmapYearRow {
    year: number;
    cells: (HeatmapCell | null)[]; // 12 cells, null if future/invalid
    totalReturn: number;
    startValue: number;
    endValue: number;
    totalChange: number;
}

export interface TimelineEntry {
    value: number;
    flow: number;
    realDataExists: boolean;
}

export const getAssetTimeline = (
    asset: Asset,
    endMonth?: string
): Map<string, TimelineEntry> => {
    const valueHistory = [...asset.valueHistory].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (valueHistory.length === 0) return new Map();

    // Map month -> data
    const monthlyData = new Map<string, { value: number; flow: number }>();

    valueHistory.forEach(entry => {
        const month = entry.date.substring(0, 7);
        const current = monthlyData.get(month) || { value: 0, flow: 0 };
        monthlyData.set(month, {
            value: entry.value,
            flow: current.flow + (entry.investmentChange || 0)
        });
    });

    // Determine range if not provided
    const historyStart = valueHistory[0].date.substring(0, 7);
    const historyEnd = valueHistory[valueHistory.length - 1].date.substring(0, 7);

    // Default to full range up to now if not restricted
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // For end date: if manual end provided, use it.
    // If not, use max(historyEnd, now) for full view
    let rangeEnd = endMonth;
    if (!rangeEnd) {
        rangeEnd = historyEnd > currentMonthStr ? historyEnd : currentMonthStr;
    }

    // However, for correct Forward Fill, we must start filling FROM THE BEGINNING of the asset history
    // up to the requested end. We can't just start in the middle because we need the carry-over value.

    // So: Generate fill from historyStart up to rangeEnd.
    // Actually, simply returning the whole timeline is safest and not too expensive.

    // Let's generate from historyStart to rangeEnd.
    const effectiveEndForFill = rangeEnd > historyStart ? rangeEnd : historyStart;

    const timeline = new Map<string, TimelineEntry>();
    const fullRange = generateMonthRange(historyStart, effectiveEndForFill);

    let lastKnownValue = 0;

    fullRange.forEach(month => {
        if (monthlyData.has(month)) {
            const data = monthlyData.get(month)!;
            timeline.set(month, { ...data, realDataExists: true });
            lastKnownValue = data.value;
        } else {
            // Forward fill value, flow is 0
            timeline.set(month, { value: lastKnownValue, flow: 0, realDataExists: false });
        }
    });

    return timeline;
};

export const calculateHeatmapData = (asset: Asset): HeatmapYearRow[] => {
    if (asset.valueHistory.length === 0) return [];

    // Calculate timeline up to now
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const timeline = getAssetTimeline(asset, currentMonthStr);

    // Determine bounds for years loop logic (same as before)
    // We sort keys to find start/end
    const months = Array.from(timeline.keys()).sort();
    if (months.length === 0) return [];

    const startMonthStr = months[0];
    const endMonthStr = months[months.length - 1];

    const startYear = parseInt(startMonthStr.substring(0, 4));
    const endYear = parseInt(endMonthStr.substring(0, 4));

    const years: HeatmapYearRow[] = [];

    for (let year = endYear; year >= startYear; year--) {
        const cells: (HeatmapCell | null)[] = [];
        let hasDataInYear = false;

        for (let month = 0; month < 12; month++) {
            const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

            // If before inception or future relative to timeline end (which is clamped to now)
            if (monthStr < startMonthStr || monthStr > endMonthStr) {
                cells.push(null);
                continue;
            }

            const currentData = timeline.get(monthStr) || { value: 0, flow: 0, realDataExists: false };

            // Previous value lookup
            let prevValue = 0;
            const date = new Date(year, month, 1);
            date.setMonth(date.getMonth() - 1);
            const prevMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (timeline.has(prevMonthStr)) {
                prevValue = timeline.get(prevMonthStr)!.value;
            }

            const flow = currentData.flow;
            const value = currentData.value;
            const basis = prevValue + flow;
            const changeValue = value - basis;
            const changePercent = basis !== 0 ? (changeValue / basis) * 100 : 0;

            if (currentData.realDataExists) hasDataInYear = true;

            cells.push({
                month: monthStr,
                value,
                previousValue: prevValue,
                changePercent,
                changeValue,
                hasData: currentData.realDataExists
            });
        }

        // Year Total Calculations
        const yearStartPrevMonth = `${year - 1}-12`;
        let yearStartValue = 0;
        if (timeline.has(yearStartPrevMonth)) {
            yearStartValue = timeline.get(yearStartPrevMonth)!.value;
        }

        // Last valid month logic
        let lastMonthInYearIndex = 11;
        // Optimization: if year is the endYear (current year), find the last non-null cell
        // Or simply strict logic:
        if (year === parseInt(currentMonthStr.substring(0, 4))) {
            lastMonthInYearIndex = parseInt(currentMonthStr.substring(5, 7)) - 1;
        }

        const lastMonthStr = `${year}-${String(lastMonthInYearIndex + 1).padStart(2, '0')}`;
        let yearEndValue = 0;
        if (timeline.has(lastMonthStr)) {
            yearEndValue = timeline.get(lastMonthStr)!.value;
        }

        let yearTotalFlow = 0;
        for (let m = 0; m <= lastMonthInYearIndex; m++) {
            const mStr = `${year}-${String(m + 1).padStart(2, '0')}`;
            if (timeline.has(mStr)) {
                yearTotalFlow += timeline.get(mStr)!.flow;
            }
        }

        const yearBasis = yearStartValue + yearTotalFlow;
        const yearChange = yearEndValue - yearBasis;
        const yearTotalReturn = yearBasis !== 0 ? (yearChange / yearBasis) * 100 : 0;

        const hasHolding = yearStartValue > 0 || yearEndValue > 0 || yearTotalFlow !== 0;

        if (hasHolding || hasDataInYear) {
            years.push({
                year,
                cells,
                totalReturn: yearTotalReturn,
                startValue: yearStartValue,
                endValue: yearEndValue,
                totalChange: yearChange
            });
        }
    }

    return years;
};
