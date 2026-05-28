import { describe, it, expect } from 'vitest';
import { computeAssetGain } from '../../utils/assetGain';
import { getDateRangeFromTimeRange } from '../../utils/dateUtils';
import { calculatePerformance } from '../../utils/performance';
import type { Asset } from '../../types';

function makeAsset(overrides: Partial<Asset> = {}): Asset {
    return {
        id: 'a1',
        name: 'Test Asset',
        category: 'etf',
        ownerId: 'p1',
        purchaseAmount: 1000,
        purchaseDate: '2024-01-01',
        currentValue: 1200,
        valueHistory: [],
        ...overrides,
    };
}

describe('computeAssetGain — all-time (no time range)', () => {
    it('gain is currentValue minus purchaseAmount', () => {
        const result = computeAssetGain(makeAsset({ currentValue: 1200, purchaseAmount: 1000 }));
        expect(result.gain).toBe(200);
    });

    it('gainPercent is gain relative to purchaseAmount', () => {
        const result = computeAssetGain(makeAsset({ currentValue: 1200, purchaseAmount: 1000 }));
        expect(result.gainPercent).toBeCloseTo(20);
    });

    it('isPositive is false when the asset is at a loss', () => {
        const result = computeAssetGain(makeAsset({ currentValue: 800, purchaseAmount: 1000 }));
        expect(result.gain).toBe(-200);
        expect(result.isPositive).toBe(false);
    });

    it('gainPercent is 0 when purchaseAmount is 0 (no divide-by-zero)', () => {
        const result = computeAssetGain(makeAsset({ currentValue: 500, purchaseAmount: 0 }));
        expect(result.gainPercent).toBe(0);
    });

    it('exposes the asset value history for the sparkline', () => {
        const asset = makeAsset({
            valueHistory: [
                { date: '2024-01-01', value: 1000 },
                { date: '2024-06-01', value: 1200 },
            ],
        });
        expect(computeAssetGain(asset).history).toEqual([
            { date: '2024-01-01', value: 1000 },
            { date: '2024-06-01', value: 1200 },
        ]);
    });
});

describe('computeAssetGain — time-range behaviour', () => {
    const periodAsset = () =>
        makeAsset({
            purchaseAmount: 1000,
            currentValue: 1800,
            valueHistory: [
                { date: '2024-01-15', value: 1000, investmentChange: 1000 },
                { date: '2024-06-15', value: 1600, investmentChange: 400 },
                { date: '2024-11-15', value: 1800, investmentChange: 0 },
            ],
        });

    it('uses all-time gain when assetsFollowGeneral is false, even with a time range', () => {
        const result = computeAssetGain(periodAsset(), {
            assetsFollowGeneral: false,
            timeRange: '1Y',
        });
        expect(result.gain).toBe(800); // 1800 - 1000, ignores the window
    });

    it('uses all-time gain for the MAX range', () => {
        const result = computeAssetGain(periodAsset(), {
            assetsFollowGeneral: true,
            timeRange: 'MAX',
        });
        expect(result.gain).toBe(800);
    });

    it('rebases to the window via calculatePerformance for a bounded range (chart invariant)', () => {
        const asset = periodAsset();
        const { startDate, endDate } = getDateRangeFromTimeRange(
            'Custom',
            '2024-01-01',
            '2024-12-31'
        );
        const expected = calculatePerformance([asset], startDate, endDate, true);
        const result = computeAssetGain(asset, {
            assetsFollowGeneral: true,
            timeRange: 'Custom',
            customStartDate: '2024-01-01',
            customEndDate: '2024-12-31',
        });
        expect(result.gain).toBeCloseTo(expected.calculatedGain, 6);
        expect(result.gainPercent).toBeCloseTo(expected.gainPercent, 6);
    });

    it('returns period history as {date, value} only and a numeric gainPercent', () => {
        const asset = makeAsset({
            purchaseAmount: 1000,
            currentValue: 1800,
            valueHistory: [
                { date: '2024-01-15', value: 1000, investmentChange: 1000 },
                { date: '2024-11-15', value: 1800, investmentChange: 0 },
            ],
        });
        const result = computeAssetGain(asset, {
            assetsFollowGeneral: true,
            timeRange: 'Custom',
            customStartDate: '2024-01-01',
            customEndDate: '2024-12-31',
        });
        expect(typeof result.gainPercent).toBe('number');
        expect(result.history.length).toBeGreaterThan(0);
        for (const point of result.history) {
            expect(Object.keys(point).sort()).toEqual(['date', 'value']);
        }
    });
});

describe('computeAssetGain — edge cases', () => {
    it('treats an exactly break-even asset as positive (gain 0)', () => {
        const result = computeAssetGain(makeAsset({ currentValue: 1000, purchaseAmount: 1000 }));
        expect(result.gain).toBe(0);
        expect(result.isPositive).toBe(true);
    });
});
