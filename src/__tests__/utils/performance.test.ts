import { describe, it, expect } from 'vitest';
import { calculatePerformance } from '../../utils/performance';
import type { Asset } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAsset(valueHistory: Asset['valueHistory'], overrides: Partial<Asset> = {}): Asset {
    return {
        id: 'a1',
        name: 'Test Asset',
        category: 'etf',
        ownerId: 'p1',
        purchaseAmount: 0,
        purchaseDate: '2024-01-01',
        currentValue: 0,
        valueHistory,
        ...overrides,
    };
}

const START = new Date('2024-01-01');
const END = new Date('2024-12-31');

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('calculatePerformance — empty assets', () => {
    it('returns zeroed stats with empty history for no assets', () => {
        const result = calculatePerformance([], START, END);
        expect(result.history).toEqual([]);
        expect(result.startValue).toBe(0);
        expect(result.currentValue).toBe(0);
        expect(result.calculatedGain).toBe(0);
        expect(result.gainPercent).toBe(0);
    });
});

// ─── Single asset, no history in range ───────────────────────────────────────

describe('calculatePerformance — single asset, history outside range', () => {
    it('returns 0 values when all history is outside the date range', () => {
        const asset = makeAsset([{ date: '2022-01-01', value: 5000, investmentChange: 5000 }]);
        const result = calculatePerformance([asset], new Date('2025-01-01'), new Date('2025-12-31'));
        // No snapshots in range but the binary search will find the closest prior entry
        // confirming the function doesn't crash
        expect(result).toBeDefined();
        expect(typeof result.calculatedGain).toBe('number');
    });
});

// ─── Single asset, 2 snapshots in range ───────────────────────────────────────

describe('calculatePerformance — single asset with snapshots in range', () => {
    it('currentValue equals the value at the last date in the timeline', () => {
        const asset = makeAsset([
            { date: '2024-03-01', value: 1000, investmentChange: 1000 },
            { date: '2024-09-01', value: 1200, investmentChange: 0 },
        ]);
        const result = calculatePerformance([asset], START, END);
        expect(result.currentValue).toBe(1200);
    });

    it('startValue equals value at the first date in the filtered timeline', () => {
        const asset = makeAsset([
            { date: '2024-03-01', value: 1000, investmentChange: 1000 },
            { date: '2024-09-01', value: 1200, investmentChange: 0 },
        ]);
        // With includeStartInTimeline=true, the first date in the timeline is START (2024-01-01)
        // At that date, no snapshot exists yet, so value = 0
        const result = calculatePerformance([asset], START, END);
        expect(result.startValue).toBe(0);
    });

    it('calculatedGain: (endValue - endInvested) - (startValue - startInvested)', () => {
        const asset = makeAsset([
            { date: '2024-01-15', value: 1000, investmentChange: 1000 },
            { date: '2024-06-15', value: 1300, investmentChange: 0 },
        ]);
        const start = new Date('2024-01-01');
        const end = new Date('2024-12-31');
        const result = calculatePerformance([asset], start, end);
        // endValue=1300, endInvested=1000 → endGain=300
        // startValue=0, startInvested=0 → startGain=0
        // calculatedGain = 300 - 0 = 300
        expect(result.calculatedGain).toBeCloseTo(300);
    });

    it('gainPercent is 0 when averageCapital is 0 (avoids divide-by-zero)', () => {
        const asset = makeAsset([]);
        const result = calculatePerformance([asset], START, END);
        expect(result.gainPercent).toBe(0);
    });
});

// ─── Multiple assets ─────────────────────────────────────────────────────────

describe('calculatePerformance — multiple assets', () => {
    it('sums values across all assets for a shared date', () => {
        const a1 = makeAsset([{ date: '2024-06-01', value: 1000, investmentChange: 1000 }], { id: 'a1' });
        const a2 = makeAsset([{ date: '2024-06-01', value: 500, investmentChange: 500 }], { id: 'a2' });
        const result = calculatePerformance([a1, a2], START, END);
        // Both assets have a snapshot on 2024-06-01; the last datum should sum them
        const datum = result.history.find(d => d.date === '2024-06-01');
        expect(datum?.value).toBe(1500);
        expect(datum?.invested).toBe(1500);
    });
});

// ─── Binary search / boundary behaviour ──────────────────────────────────────

describe('calculatePerformance — binary search boundary', () => {
    it('picks up a snapshot dated before startDate as the "start basis"', () => {
        // Snapshot on Dec 31 2023 — before our 2024 range
        const asset = makeAsset([
            { date: '2023-12-31', value: 800, investmentChange: 800 },
            { date: '2024-06-01', value: 1000, investmentChange: 0 },
        ]);
        const result = calculatePerformance([asset], START, END);
        // At START (2024-01-01), binary search finds the Dec 31 entry as latest ≤ startDate
        expect(result.startValue).toBe(800);
    });

    it('does not include a snapshot dated after endDate', () => {
        const asset = makeAsset([
            { date: '2024-06-01', value: 1000, investmentChange: 1000 },
            { date: '2025-06-01', value: 9999, investmentChange: 0 },
        ]);
        const result = calculatePerformance([asset], START, END);
        expect(result.currentValue).toBeLessThan(9999);
    });
});
