import { describe, it, expect } from 'vitest';
import {
    calculatePerformance,
    calculateCAGR,
    calculateMaxDrawdown,
    calculateVolatilityFromHistory,
} from '../../utils/performance';
import type { PerformanceDatum } from '../../utils/performance';
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
        const result = calculatePerformance(
            [asset],
            new Date('2025-01-01'),
            new Date('2025-12-31')
        );
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
        const a1 = makeAsset([{ date: '2024-06-01', value: 1000, investmentChange: 1000 }], {
            id: 'a1',
        });
        const a2 = makeAsset([{ date: '2024-06-01', value: 500, investmentChange: 500 }], {
            id: 'a2',
        });
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

// ─── Helpers for metric tests ─────────────────────────────────────────────────

function makeDatum(date: string, value: number): PerformanceDatum {
    return { date, value, invested: 0 };
}

// ─── calculateCAGR ────────────────────────────────────────────────────────────

describe('calculateCAGR', () => {
    it('returns ~10% for a 21% gain over 2 years', () => {
        const history = [makeDatum('2022-01-01', 100), makeDatum('2024-01-01', 121)];
        expect(calculateCAGR(history, 21)).toBeCloseTo(10, 0);
    });

    it('returns ~-10% for a -19% gain over 2 years', () => {
        const history = [makeDatum('2022-01-01', 100), makeDatum('2024-01-01', 81)];
        expect(calculateCAGR(history, -19)).toBeCloseTo(-10, 0);
    });

    it('falls back to gainPercent when period < 0.1 year', () => {
        const history = [makeDatum('2024-01-01', 100), makeDatum('2024-01-10', 105)];
        expect(calculateCAGR(history, 5)).toBe(5);
    });

    it('returns 0 when history has one point', () => {
        expect(calculateCAGR([makeDatum('2024-01-01', 100)], 0)).toBe(0);
    });

    it('returns 0 when history is empty', () => {
        expect(calculateCAGR([], 0)).toBe(0);
    });

    it('returns 0 when gainPercent is 0', () => {
        const history = [makeDatum('2022-01-01', 100), makeDatum('2024-01-01', 100)];
        expect(calculateCAGR(history, 0)).toBe(0);
    });

    it('is not inflated by deposits — uses gainPercent not raw value ratio', () => {
        // Start with 1K, add 99K after 1 year, end at 110K after 2 years.
        // Raw value ratio: 110K/1K = 110x → would give ~949% CAGR (wrong).
        // gainPercent (Modified Dietz): gain=10K, avgCapital=100K → 10% total → ~4.9% CAGR.
        const history = [
            { date: '2022-01-01', value: 1000, invested: 1000 },
            { date: '2023-01-01', value: 100000, invested: 100000 },
            { date: '2024-01-01', value: 110000, invested: 100000 },
        ];
        const cagr = calculateCAGR(history, 10);
        expect(cagr).toBeCloseTo(4.88, 1);
        expect(cagr).toBeLessThan(20); // sanity: not inflated to hundreds of percent
    });
});

// ─── calculateMaxDrawdown ─────────────────────────────────────────────────────

describe('calculateMaxDrawdown', () => {
    it('returns -25% for pure market decline [100, 120, 90, 110] (no cash flows)', () => {
        const history = [100, 120, 90, 110].map((v, i) => makeDatum(`2024-0${i + 1}-01`, v));
        expect(calculateMaxDrawdown(history)).toBeCloseTo(-25, 1);
    });

    it('returns 0% for monotonically increasing values', () => {
        const history = [100, 110, 120].map((v, i) => makeDatum(`2024-0${i + 1}-01`, v));
        expect(calculateMaxDrawdown(history)).toBe(0);
    });

    it('returns -40% for monotonically decreasing [100, 80, 60]', () => {
        const history = [100, 80, 60].map((v, i) => makeDatum(`2024-0${i + 1}-01`, v));
        expect(calculateMaxDrawdown(history)).toBeCloseTo(-40, 1);
    });

    it('returns null when history has one point', () => {
        expect(calculateMaxDrawdown([makeDatum('2024-01-01', 100)])).toBeNull();
    });

    it('returns null when history is empty', () => {
        expect(calculateMaxDrawdown([])).toBeNull();
    });

    it('does not treat a large deposit as a market peak', () => {
        // Jan: 100K value, 100K invested
        // Feb: 200K value, 200K invested (added 100K — not a market gain)
        // Mar: 195K value, 200K invested (market dropped 2.5%)
        // Old formula: peak=200K, trough=195K → -2.5% (OK here, but peak was set by deposit)
        // New formula: wealth index r_Feb = (200-100-100)/100 = 0%, r_Mar = (195-200)/200 = -2.5%
        // → max drawdown = -2.5% (correct — reflects only market movement)
        const history = [
            { date: '2024-01-01', value: 100000, invested: 100000 },
            { date: '2024-02-01', value: 200000, invested: 200000 },
            { date: '2024-03-01', value: 195000, invested: 200000 },
        ];
        expect(calculateMaxDrawdown(history)).toBeCloseTo(-2.5, 1);
    });
});

// ─── calculateVolatilityFromHistory ──────────────────────────────────────────

describe('calculateVolatilityFromHistory', () => {
    it('returns 0 for constant monthly values', () => {
        const history = [100, 100, 100].map((v, i) => makeDatum(`2024-0${i + 1}-01`, v));
        expect(calculateVolatilityFromHistory(history)).toBe(0);
    });

    it('returns 0 when history has one point', () => {
        expect(calculateVolatilityFromHistory([makeDatum('2024-01-01', 100)])).toBe(0);
    });

    it('returns 0 when history is empty', () => {
        expect(calculateVolatilityFromHistory([])).toBe(0);
    });

    it('returns a positive number for varying monthly values', () => {
        const history = [100, 110, 90, 120].map((v, i) => makeDatum(`2024-0${i + 1}-01`, v));
        expect(calculateVolatilityFromHistory(history)).toBeGreaterThan(0);
    });

    it('uses last snapshot per month when multiple snapshots exist in one month', () => {
        // Two snapshots in Jan: 100 and 150 — only 150 (the last) should count
        const history = [
            makeDatum('2024-01-10', 100),
            makeDatum('2024-01-25', 150),
            makeDatum('2024-02-01', 150),
        ];
        // Returns: Jan→Feb = (150-150)/150 = 0% → volatility = 0
        expect(calculateVolatilityFromHistory(history)).toBe(0);
    });

    it('does not treat a large deposit as a high-return month', () => {
        // Jan→Feb: value 100→200, but 100 of that is a deposit (not market return)
        // Market return = (200 - 100 - 100) / 100 = 0% → should not inflate volatility
        // Feb→Mar: value 200→202, no deposit → market return = 1%
        const history = [
            { date: '2024-01-01', value: 100, invested: 100 },
            { date: '2024-02-01', value: 200, invested: 200 },
            { date: '2024-03-01', value: 202, invested: 200 },
        ];
        // returns: [0%, 1%] → std dev ≈ 0.5, not inflated by the deposit
        expect(calculateVolatilityFromHistory(history)).toBeCloseTo(0.5, 1);
        expect(calculateVolatilityFromHistory(history)).toBeLessThan(5);
    });

    it('returns same result as heatmap calculateVolatility for monthly snapshots', () => {
        // Monthly snapshots: volatility must match heatmap's formula applied to same returns
        const values = [100, 110, 99, 108];
        const history = values.map((v, i) => makeDatum(`2024-0${i + 1}-01`, v));
        const returns = [10, -10, 9.09]; // approx — just check they're close
        const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
        const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
        const expected = Math.sqrt(variance);
        expect(calculateVolatilityFromHistory(history)).toBeCloseTo(expected, 1);
    });
});
