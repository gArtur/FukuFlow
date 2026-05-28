import { useState } from 'react';

export type ChartView = 'totalWorth' | 'performance';

const STORAGE_KEY = 'chartView';
const DEFAULT_VIEW: ChartView = 'totalWorth';

/**
 * localStorage-backed chart view selection for the Total Worth chart card.
 * Remembers the user's last choice across sessions; defaults to 'totalWorth'.
 */
export function useChartView(): [ChartView, (view: ChartView) => void] {
    const [view, setViewState] = useState<ChartView>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved === 'performance' || saved === 'totalWorth' ? saved : DEFAULT_VIEW;
    });

    const setView = (next: ChartView) => {
        localStorage.setItem(STORAGE_KEY, next);
        setViewState(next);
    };

    return [view, setView];
}
