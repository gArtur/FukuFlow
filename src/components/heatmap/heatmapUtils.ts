/**
 * Utility functions for the Portfolio Heatmap
 * Extracted from PortfolioHeatmap.tsx for reusability and testability
 */

/**
 * Get CSS color class based on percentage change
 */
export const getColorClass = (changePercent: number): string => {
    if (changePercent >= 5) return 'gain-high';
    if (changePercent >= 2) return 'gain-medium';
    if (changePercent >= 0.5) return 'gain-low';
    if (changePercent >= -0.5) return 'neutral';
    if (changePercent >= -2) return 'loss-low';
    if (changePercent >= -5) return 'loss-medium';
    return 'loss-high';
};

/**
 * Format a value in compact notation (e.g., "15.2k" or "1.5M")
 */
export const formatCompactValue = (value: number, isHidden: boolean): string => {
    if (isHidden) return '***';
    if (Math.abs(value) >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `${(value / 1_000).toFixed(1)}k`;
    }
    return value.toFixed(0);
};

/**
 * Check if a month is the first month of its year (for year separator rendering)
 */
export const isFirstMonthOfYear = (month: string, index: number): boolean => {
    if (index === 0) return false; // Don't show separator before first column
    return month.endsWith('-01');
};

/**
 * Get quick filter date range
 */
export const getQuickFilterRange = (
    filter: 'YTD' | '1Y' | '5Y' | 'MAX',
    minMonth: string,
    maxMonth: string
): { start: string; end: string } => {
    const now = new Date();
    const currentYear = now.getFullYear();

    switch (filter) {
        case 'YTD':
            return {
                start: `${currentYear}-01`,
                end: maxMonth,
            };
        case '1Y': {
            const oneYearAgo = new Date(now);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const startMonth = `${oneYearAgo.getFullYear()}-${String(oneYearAgo.getMonth() + 1).padStart(2, '0')}`;
            return {
                start: startMonth < minMonth ? minMonth : startMonth,
                end: maxMonth,
            };
        }
        case '5Y': {
            const fiveYearsAgo = new Date(now);
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
            const startMonth = `${fiveYearsAgo.getFullYear()}-${String(fiveYearsAgo.getMonth() + 1).padStart(2, '0')}`;
            return {
                start: startMonth < minMonth ? minMonth : startMonth,
                end: maxMonth,
            };
        }
        case 'MAX':
        default:
            return { start: minMonth, end: maxMonth };
    }
};

/**
 * Calculate volatility (standard deviation of monthly returns)
 */
export const calculateVolatility = (monthlyReturns: number[]): number => {
    if (monthlyReturns.length === 0) return 0;
    const mean = monthlyReturns.reduce((sum, val) => sum + val, 0) / monthlyReturns.length;
    const variance =
        monthlyReturns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        monthlyReturns.length;
    return Math.sqrt(variance);
};
