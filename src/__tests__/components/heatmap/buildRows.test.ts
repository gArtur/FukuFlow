import { describe, it, expect } from 'vitest';
import {
    buildAssetHeatmapRow,
    buildPortfolioHeatmapRow,
} from '../../../components/heatmap/buildRows';
import type { Asset, ValueEntry } from '../../../types';

function asset(name: string, history: ValueEntry[]): Asset {
    return {
        id: name,
        name,
        category: 'etf',
        ownerId: 'p1',
        purchaseDate: history[0]?.date ?? '2024-01-01',
        purchaseAmount: history[0]?.investmentChange ?? 0,
        currentValue: history[history.length - 1]?.value ?? 0,
        valueHistory: history,
    };
}

const MONTHS = ['2024-01', '2024-02', '2024-03'];

// Same fixtures as PortfolioHeatmap.test.tsx, asserted at the builder interface:
//              2024-01      2024-02      2024-03
//   Alpha   10000 (+10k)  11000        12000
//   Beta         —        5000 (+5k)   6000
const alpha = asset('Alpha', [
    { date: '2024-01-15', value: 10000, investmentChange: 10000 },
    { date: '2024-02-15', value: 11000, investmentChange: 0 },
    { date: '2024-03-15', value: 12000, investmentChange: 0 },
]);
const beta = asset('Beta', [
    { date: '2024-02-15', value: 5000, investmentChange: 5000 },
    { date: '2024-03-15', value: 6000, investmentChange: 0 },
]);

describe('buildAssetHeatmapRow', () => {
    it('returns one empty cell per visible month for an asset with no history', () => {
        const row = buildAssetHeatmapRow(asset('Empty', []), MONTHS, '2024-03', 'Me');
        expect(row.cells).toHaveLength(3);
        expect(row.cells.every(c => !c.exists)).toBe(true);
        expect(row.totalChange).toBe(0);
        expect(row.totalChangePercent).toBe(0);
    });

    it('marks the first data month as inception with a zeroed Sub-period Return', () => {
        const row = buildAssetHeatmapRow(alpha, MONTHS, '2024-03', 'Me');
        expect(row.cells[0].isInception).toBe(true);
        expect(row.cells[0].change).toBe(0);
        expect(row.cells[0].changePercent).toBe(0);
    });

    it('computes per-month Sub-period Return against the prior month', () => {
        const row = buildAssetHeatmapRow(alpha, MONTHS, '2024-03', 'Me');
        // Feb: (11000 - 10000) / 10000 = +10%
        expect(row.cells[1].change).toBe(1000);
        expect(row.cells[1].changePercent).toBeCloseTo(10);
    });

    it('range total rebases on the inception basis (Alpha = +2000 on 10000 = +20%)', () => {
        const row = buildAssetHeatmapRow(alpha, MONTHS, '2024-03', 'Me');
        expect(row.totalChange).toBe(2000);
        expect(row.totalChangePercent).toBeCloseTo(20);
        expect(row.ownerName).toBe('Me');
    });

    it('guards a month to 0% when previousValue + flow is non-positive', () => {
        // Feb basis = 1000 (prev) + (-1500) (withdrawal) = -500 (< 0) → 0%.
        const solo = asset('Solo', [
            { date: '2024-01-15', value: 1000, investmentChange: 1000 },
            { date: '2024-02-15', value: 200, investmentChange: -1500 },
        ]);
        const row = buildAssetHeatmapRow(solo, ['2024-01', '2024-02'], '2024-02', 'Me');
        expect(row.cells[1].changePercent).toBe(0);
        // change is still the cash-flow-adjusted delta: 200 - (1000 + -1500) = 700
        expect(row.cells[1].change).toBe(700);
    });
});

describe('buildPortfolioHeatmapRow', () => {
    const rows = [
        buildAssetHeatmapRow(alpha, MONTHS, '2024-03', 'Me'),
        buildAssetHeatmapRow(beta, MONTHS, '2024-03', 'Me'),
    ];

    it('sums each month column-wise across the per-asset cells', () => {
        const portfolio = buildPortfolioHeatmapRow(rows, MONTHS);
        // 2024-03: value 12000 + 6000 = 18000; change +1000 + +1000 = +2000
        expect(portfolio.cells[2].value).toBe(18000);
        expect(portfolio.cells[2].change).toBe(2000);
    });

    it('range total equals the sum of the per-asset range totals (+3000 on 15000 = +20%)', () => {
        const portfolio = buildPortfolioHeatmapRow(rows, MONTHS);
        expect(portfolio.totalChange).toBe(rows[0].totalChange + rows[1].totalChange);
        expect(portfolio.totalChange).toBe(3000);
        expect(portfolio.totalChangePercent).toBeCloseTo(20);
    });

    it('is labelled as the TOTAL PORTFOLIO row', () => {
        const portfolio = buildPortfolioHeatmapRow(rows, MONTHS);
        expect(portfolio.id).toBe('portfolio-total');
        expect(portfolio.name).toBe('TOTAL PORTFOLIO');
    });
});
