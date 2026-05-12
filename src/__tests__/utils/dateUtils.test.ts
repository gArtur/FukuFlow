import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    formatShortDate,
    formatMonthLabel,
    formatFullMonthYear,
    getMonthFromDate,
    getPreviousMonth,
    getNextMonth,
    generateMonthRange,
    getDateRangeFromTimeRange,
} from '../../utils/dateUtils';

describe('formatShortDate', () => {
    it('formats an ISO date string to short US format', () => {
        expect(formatShortDate('2025-12-19')).toBe('Dec 19, 2025');
    });

    it('formats a Date object', () => {
        expect(formatShortDate(new Date(2025, 0, 5))).toBe('Jan 5, 2025');
    });
});

describe('formatMonthLabel', () => {
    it('formats December 2025', () => {
        expect(formatMonthLabel('2025-12')).toBe('Dec 25');
    });

    it('formats January 2024', () => {
        expect(formatMonthLabel('2024-01')).toBe('Jan 24');
    });

    it('formats June 2020', () => {
        expect(formatMonthLabel('2020-06')).toBe('Jun 20');
    });
});

describe('formatFullMonthYear', () => {
    it('formats January 2025', () => {
        expect(formatFullMonthYear('2025-01')).toBe('January 2025');
    });

    it('formats December 2023', () => {
        expect(formatFullMonthYear('2023-12')).toBe('December 2023');
    });

    it('formats July 2000', () => {
        expect(formatFullMonthYear('2000-07')).toBe('July 2000');
    });
});

describe('getMonthFromDate', () => {
    it('extracts YYYY-MM from a full ISO string', () => {
        expect(getMonthFromDate('2025-06-15T10:30:00.000Z')).toBe('2025-06');
    });

    it('extracts YYYY-MM from a date-only string', () => {
        expect(getMonthFromDate('2024-01-01')).toBe('2024-01');
    });
});

describe('getPreviousMonth', () => {
    it('returns the previous month in mid-year', () => {
        expect(getPreviousMonth('2025-06')).toBe('2025-05');
    });

    it('wraps January to December of the previous year', () => {
        expect(getPreviousMonth('2025-01')).toBe('2024-12');
    });

    it('pads single-digit months with a leading zero', () => {
        expect(getPreviousMonth('2025-10')).toBe('2025-09');
    });
});

describe('getNextMonth', () => {
    it('returns the next month in mid-year', () => {
        expect(getNextMonth('2025-06')).toBe('2025-07');
    });

    it('wraps December to January of the next year', () => {
        expect(getNextMonth('2025-12')).toBe('2026-01');
    });

    it('pads single-digit months with a leading zero', () => {
        expect(getNextMonth('2025-09')).toBe('2025-10');
    });
});

describe('generateMonthRange', () => {
    it('returns a single-element array when start equals end', () => {
        expect(generateMonthRange('2025-06', '2025-06')).toEqual(['2025-06']);
    });

    it('returns sequential months within a year', () => {
        expect(generateMonthRange('2025-01', '2025-04')).toEqual([
            '2025-01',
            '2025-02',
            '2025-03',
            '2025-04',
        ]);
    });

    it('spans year boundaries correctly', () => {
        expect(generateMonthRange('2024-11', '2025-02')).toEqual([
            '2024-11',
            '2024-12',
            '2025-01',
            '2025-02',
        ]);
    });

    it('returns empty array when start is after end', () => {
        expect(generateMonthRange('2025-06', '2025-05')).toEqual([]);
    });
});

describe('getDateRangeFromTimeRange', () => {
    const FIXED_NOW = new Date('2025-06-15T12:00:00.000Z');

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(FIXED_NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('MAX returns startDate from year 2000', () => {
        const { startDate, endDate } = getDateRangeFromTimeRange('MAX');
        expect(startDate.getFullYear()).toBe(2000);
        expect(endDate.toDateString()).toBe(FIXED_NOW.toDateString());
    });

    it('YTD returns Jan 1 of the current year', () => {
        const { startDate } = getDateRangeFromTimeRange('YTD');
        expect(startDate.getFullYear()).toBe(2025);
        expect(startDate.getMonth()).toBe(0); // January
        expect(startDate.getDate()).toBe(1);
    });

    it('1Y returns approximately 365 days ago', () => {
        const { startDate } = getDateRangeFromTimeRange('1Y');
        const diffMs = FIXED_NOW.getTime() - startDate.getTime();
        const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
        expect(diffDays).toBe(365);
    });

    it('5Y returns approximately 5×365 days ago', () => {
        const { startDate } = getDateRangeFromTimeRange('5Y');
        const diffMs = FIXED_NOW.getTime() - startDate.getTime();
        const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
        expect(diffDays).toBe(5 * 365);
    });

    it('Custom uses the provided start and end dates', () => {
        const { startDate, endDate } = getDateRangeFromTimeRange(
            'Custom',
            '2023-01-01',
            '2023-12-31'
        );
        expect(startDate.toISOString().startsWith('2023-01-01')).toBe(true);
        expect(endDate.toISOString().startsWith('2023-12-31')).toBe(true);
    });

    it('Custom with only start date uses now as end', () => {
        const { startDate, endDate } = getDateRangeFromTimeRange('Custom', '2022-06-01');
        expect(startDate.toISOString().startsWith('2022-06-01')).toBe(true);
        expect(endDate.toDateString()).toBe(FIXED_NOW.toDateString());
    });
});
