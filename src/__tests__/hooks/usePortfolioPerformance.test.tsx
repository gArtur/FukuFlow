import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePortfolioPerformance } from '../../hooks/usePortfolioPerformance';
import type { PerformanceWindow } from '../../hooks/usePortfolioPerformance';
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
        currentValue: 1800,
        valueHistory: [
            { date: '2024-01-15', value: 1000, investmentChange: 1000 },
            { date: '2024-06-15', value: 1600, investmentChange: 400 },
            { date: '2024-11-15', value: 1800, investmentChange: 0 },
        ],
        ...overrides,
    };
}

const customWindow: PerformanceWindow = {
    assetsFollowGeneral: true,
    timeRange: 'Custom',
    customStartDate: '2024-01-01',
    customEndDate: '2024-12-31',
};

describe('usePortfolioPerformance — per-asset gains', () => {
    it('getAssetGain matches computeAssetGain for the all-time window', () => {
        const asset = makeAsset();
        const { result } = renderHook(() => usePortfolioPerformance([asset], {}));
        expect(result.current.getAssetGain(asset)).toEqual(computeAssetGain(asset, {}));
    });

    it('getAssetGain matches computeAssetGain for a bounded follow-general window', () => {
        const asset = makeAsset();
        const { result } = renderHook(() => usePortfolioPerformance([asset], customWindow));
        expect(result.current.getAssetGain(asset)).toEqual(computeAssetGain(asset, customWindow));
    });
});

describe('usePortfolioPerformance — portfolio series', () => {
    it('matches calculatePerformance over the active bounded window', () => {
        const assets = [makeAsset(), makeAsset({ id: 'a2', name: 'Second' })];
        const { startDate, endDate } = getDateRangeFromTimeRange(
            'Custom',
            '2024-01-01',
            '2024-12-31'
        );
        const expected = calculatePerformance(assets, startDate, endDate, true);
        const { result } = renderHook(() => usePortfolioPerformance(assets, customWindow));
        expect(result.current.portfolio).toEqual(expected);
    });

    it('uses includeStartInTimeline=false for the MAX range', () => {
        const assets = [makeAsset()];
        const { startDate, endDate } = getDateRangeFromTimeRange('MAX');
        const expected = calculatePerformance(assets, startDate, endDate, false);
        const { result } = renderHook(() =>
            usePortfolioPerformance(assets, { timeRange: 'MAX' })
        );
        expect(result.current.portfolio).toEqual(expected);
    });
});

describe('usePortfolioPerformance — memoization', () => {
    it('returns a stable result for unchanged (assets, window)', () => {
        const assets = [makeAsset()];
        const { result, rerender } = renderHook(
            ({ a, w }: { a: Asset[]; w: PerformanceWindow }) => usePortfolioPerformance(a, w),
            { initialProps: { a: assets, w: customWindow } }
        );
        const first = result.current;
        rerender({ a: assets, w: customWindow });
        expect(result.current).toBe(first);
    });

    it('recomputes when the time range changes', () => {
        const assets = [makeAsset()];
        const { result, rerender } = renderHook(
            ({ w }: { w: PerformanceWindow }) => usePortfolioPerformance(assets, w),
            { initialProps: { w: customWindow } }
        );
        const first = result.current;
        rerender({ w: { ...customWindow, timeRange: 'MAX' } });
        expect(result.current).not.toBe(first);
    });

    it('recomputes when the assets array reference changes', () => {
        const { result, rerender } = renderHook(
            ({ a }: { a: Asset[] }) => usePortfolioPerformance(a, customWindow),
            { initialProps: { a: [makeAsset()] } }
        );
        const first = result.current;
        rerender({ a: [makeAsset()] });
        expect(result.current).not.toBe(first);
    });
});
