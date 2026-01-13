/**
 * Shared date utilities for the FukuFlow application
 */

const MONTH_ABBREV = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];
const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

/**
 * Format a date as short form (e.g., "Dec 19, 2025")
 */
export function formatShortDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/**
 * Format a YYYY-MM string as abbreviated month and year (e.g., "Dec 25")
 */
export function formatMonthLabel(month: string): string {
    const [year, m] = month.split('-');
    return `${MONTH_ABBREV[parseInt(m) - 1]} ${year.slice(2)}`;
}

/**
 * Format a YYYY-MM string as full month and year (e.g., "December 2025")
 */
export function formatFullMonthYear(month: string): string {
    const [year, m] = month.split('-');
    return `${MONTH_NAMES[parseInt(m) - 1]} ${year}`;
}

/**
 * Get the month portion (YYYY-MM) from an ISO date string
 */
export function getMonthFromDate(date: string): string {
    return date.substring(0, 7);
}

/**
 * Get the previous month string from a YYYY-MM format
 */
export function getPreviousMonth(month: string): string {
    const [year, m] = month.split('-').map(Number);
    if (m === 1) {
        return `${year - 1}-12`;
    }
    return `${year}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Get the next month string from a YYYY-MM format
 */
export function getNextMonth(month: string): string {
    const [year, m] = month.split('-').map(Number);
    if (m === 12) {
        return `${year + 1}-01`;
    }
    return `${year}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Generate all months between start and end (inclusive), in YYYY-MM format
 */
export function generateMonthRange(start: string, end: string): string[] {
    const months: string[] = [];
    let current = start;
    while (current <= end) {
        months.push(current);
        current = getNextMonth(current);
    }
    return months;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get current month as YYYY-MM string
 */
export function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
