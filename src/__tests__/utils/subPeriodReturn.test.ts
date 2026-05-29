import { describe, it, expect } from 'vitest';
import { subPeriodReturn, monthlyReturns } from '../../utils/subPeriodReturn';
import type { PerformanceDatum } from '../../utils/performance';

describe('subPeriodReturn', () => {
    it('calculates cash-flow-adjusted return for positive basis', () => {
        // startValue=1000, endValue=1200, netFlow=0 -> change=200, returnPercent=20%
        const result = subPeriodReturn(1000, 1200, 0);
        expect(result.change).toBe(200);
        expect(result.returnPercent).toBe(20);
    });

    it('calculates loss correctly', () => {
        // startValue=1000, endValue=900, netFlow=0 -> change=-100, returnPercent=-10%
        const result = subPeriodReturn(1000, 900, 0);
        expect(result.change).toBe(-100);
        expect(result.returnPercent).toBe(-10);
    });

    it('shifts the basis with flows (e.g. deposit lowers percentage return)', () => {
        // startValue=1000, endValue=1200, netFlow=100
        // basis = 1000 + 100 = 1100
        // change = 1200 - 1100 = 100
        // return = 100 / 1100 * 100 = 9.0909...%
        const result = subPeriodReturn(1000, 1200, 100);
        expect(result.change).toBe(100);
        expect(result.returnPercent).toBeCloseTo(9.0909, 4);
    });

    it('guards returnPercent to 0% when basis is 0', () => {
        // startValue=0, endValue=100, netFlow=0
        // basis = 0
        // change = 100 - 0 = 100
        // returnPercent = 0%
        const result = subPeriodReturn(0, 100, 0);
        expect(result.change).toBe(100);
        expect(result.returnPercent).toBe(0);
    });

    it('guards returnPercent to 0% when basis is strictly negative', () => {
        // startValue=-200, endValue=100, netFlow=50
        // basis = -150
        // change = 100 - (-150) = 250
        // returnPercent = 0%
        const result = subPeriodReturn(-200, 100, 50);
        expect(result.change).toBe(250);
        expect(result.returnPercent).toBe(0);
    });
});

describe('monthlyReturns', () => {
    it('returns empty array for empty history', () => {
        expect(monthlyReturns([])).toEqual([]);
    });

    it('returns empty array for single-point history', () => {
        const history: PerformanceDatum[] = [
            { date: '2024-01-15', value: 1000, invested: 1000 }
        ];
        expect(monthlyReturns(history)).toEqual([]);
    });

    it('calculates returns for consecutive months (two points)', () => {
        const history: PerformanceDatum[] = [
            { date: '2024-01-15', value: 1000, invested: 1000 },
            { date: '2024-02-15', value: 1200, invested: 1000 }
        ];
        // Jan -> Feb: basis=1000, change=200 -> return=20%
        expect(monthlyReturns(history)).toEqual([20]);
    });

    it('deduplicates multiple snapshots in the same month, keeping the last one', () => {
        const history: PerformanceDatum[] = [
            { date: '2024-01-05', value: 800, invested: 800 },
            { date: '2024-01-25', value: 1000, invested: 1000 }, // Jan last snapshot
            { date: '2024-02-10', value: 1100, invested: 1000 },
            { date: '2024-02-28', value: 1200, invested: 1000 }  // Feb last snapshot
        ];
        // Jan last: 1000 value, 1000 invested
        // Feb last: 1200 value, 1000 invested
        // Return: (1200 - 1000) / 1000 * 100 = 20%
        expect(monthlyReturns(history)).toEqual([20]);
    });

    it('pairs adjacent months in history even if they are non-consecutive chronologically', () => {
        const history: PerformanceDatum[] = [
            { date: '2024-01-15', value: 1000, invested: 1000 },
            { date: '2024-03-15', value: 1200, invested: 1000 }
        ];
        // Jan -> Mar: basis=1000, change=200 -> return=20%
        expect(monthlyReturns(history)).toEqual([20]);
    });

    it('skips periods where basis <= 0', () => {
        const history: PerformanceDatum[] = [
            { date: '2024-01-15', value: -100, invested: 0 },
            { date: '2024-02-15', value: 50, invested: 50 }
        ];
        expect(monthlyReturns(history)).toEqual([]);
    });

    it('handles unsorted history input chronologically', () => {
        const history: PerformanceDatum[] = [
            { date: '2024-02-15', value: 1200, invested: 1000 },
            { date: '2024-01-15', value: 1000, invested: 1000 }
        ];
        // Even though Feb comes first in the array, it should be sorted chronologically:
        // Jan -> Feb: basis=1000, change=200 -> return=20%
        expect(monthlyReturns(history)).toEqual([20]);
    });
});


