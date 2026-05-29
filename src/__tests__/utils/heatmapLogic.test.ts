import { describe, it, expect } from 'vitest';
import { getAssetTimeline, calculateHeatmapData } from '../../utils/heatmapLogic';
import type { Asset } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAsset(valueHistory: Asset['valueHistory']): Asset {
    return {
        id: 'test-asset',
        name: 'Test Asset',
        category: 'etf',
        ownerId: 'p1',
        purchaseAmount: 0,
        purchaseDate: '2024-01-01',
        currentValue: 0,
        valueHistory,
    };
}

// ─── getAssetTimeline ────────────────────────────────────────────────────────

describe('getAssetTimeline', () => {
    it('returns empty Map for asset with no history', () => {
        const timeline = getAssetTimeline(makeAsset([]));
        expect(timeline.size).toBe(0);
    });

    it('single snapshot → map has exactly that month', () => {
        const asset = makeAsset([{ date: '2024-06-01', value: 1000, investmentChange: 0 }]);
        const timeline = getAssetTimeline(asset, '2024-06');
        expect(timeline.has('2024-06')).toBe(true);
        expect(timeline.get('2024-06')?.value).toBe(1000);
        expect(timeline.get('2024-06')?.realDataExists).toBe(true);
    });

    it('two consecutive months — both present with correct values', () => {
        const asset = makeAsset([
            { date: '2024-01-01', value: 1000 },
            { date: '2024-02-01', value: 1100 },
        ]);
        const timeline = getAssetTimeline(asset, '2024-02');
        expect(timeline.get('2024-01')?.value).toBe(1000);
        expect(timeline.get('2024-02')?.value).toBe(1100);
        expect(timeline.get('2024-02')?.realDataExists).toBe(true);
    });

    it('forward-fills gap months with the previous known value', () => {
        const asset = makeAsset([
            { date: '2024-01-01', value: 1000 },
            { date: '2024-04-01', value: 1200 },
        ]);
        const timeline = getAssetTimeline(asset, '2024-04');
        // Feb and Mar should be forward-filled with Jan value
        expect(timeline.get('2024-02')?.value).toBe(1000);
        expect(timeline.get('2024-02')?.realDataExists).toBe(false);
        expect(timeline.get('2024-03')?.value).toBe(1000);
        expect(timeline.get('2024-03')?.realDataExists).toBe(false);
        // Apr has real data
        expect(timeline.get('2024-04')?.value).toBe(1200);
        expect(timeline.get('2024-04')?.realDataExists).toBe(true);
    });

    it('bridges December → January year boundary correctly', () => {
        const asset = makeAsset([
            { date: '2023-12-01', value: 5000 },
            { date: '2024-02-01', value: 5200 },
        ]);
        const timeline = getAssetTimeline(asset, '2024-02');
        expect(timeline.has('2024-01')).toBe(true);
        expect(timeline.get('2024-01')?.value).toBe(5000); // forward-filled
        expect(timeline.get('2024-01')?.realDataExists).toBe(false);
    });

    it('populates flow from investmentChange', () => {
        const asset = makeAsset([{ date: '2024-03-01', value: 1500, investmentChange: 200 }]);
        const timeline = getAssetTimeline(asset, '2024-03');
        expect(timeline.get('2024-03')?.flow).toBe(200);
    });

    it('forward-filled months have flow = 0', () => {
        const asset = makeAsset([
            { date: '2024-01-01', value: 1000, investmentChange: 500 },
            { date: '2024-03-01', value: 1100 },
        ]);
        const timeline = getAssetTimeline(asset, '2024-03');
        expect(timeline.get('2024-02')?.flow).toBe(0);
    });

    it('does not include months beyond endMonth', () => {
        const asset = makeAsset([
            { date: '2024-01-01', value: 1000 },
            { date: '2024-06-01', value: 1500 },
        ]);
        const timeline = getAssetTimeline(asset, '2024-03');
        // Should not go beyond 2024-03
        expect(timeline.has('2024-04')).toBe(false);
        expect(timeline.has('2024-06')).toBe(false);
    });
});

// ─── calculateHeatmapData ────────────────────────────────────────────────────

describe('calculateHeatmapData', () => {
    it('returns [] for asset with no history', () => {
        expect(calculateHeatmapData(makeAsset([]))).toEqual([]);
    });

    it('changePercent formula: (value - prevValue - flow) / (prevValue + flow)', () => {
        const asset = makeAsset([
            { date: '2024-01-01', value: 1000 },
            { date: '2024-02-01', value: 1100 },
        ]);
        const rows = calculateHeatmapData(asset);
        // Find the year row for 2024
        const row2024 = rows.find(r => r.year === 2024);
        expect(row2024).toBeDefined();
        // Feb cell (index 1): prevValue=1000, flow=0, value=1100
        // changePercent = (1100-1000-0)/(1000+0)*100 = 10%
        const febCell = row2024!.cells[1]; // index 1 = February
        expect(febCell).not.toBeNull();
        expect(febCell?.changePercent).toBeCloseTo(10);
        expect(febCell?.changeValue).toBe(100);
    });

    it('accounts for investmentChange in the basis (flow)', () => {
        const asset = makeAsset([
            { date: '2024-01-01', value: 1000 },
            { date: '2024-02-01', value: 1300, investmentChange: 200 },
        ]);
        const rows = calculateHeatmapData(asset);
        const row2024 = rows.find(r => r.year === 2024);
        // Feb: prevValue=1000, flow=200, value=1300
        // basis = 1000+200 = 1200
        // changeValue = 1300-1200 = 100
        // changePercent = 100/1200*100 ≈ 8.33%
        const febCell = row2024!.cells[1];
        expect(febCell?.changeValue).toBeCloseTo(100);
        expect(febCell?.changePercent).toBeCloseTo(8.333, 2);
    });

    it('returns rows sorted descending by year', () => {
        const asset = makeAsset([
            { date: '2022-06-01', value: 800 },
            { date: '2023-06-01', value: 1000 },
            { date: '2024-06-01', value: 1200 },
        ]);
        const rows = calculateHeatmapData(asset);
        const years = rows.map(r => r.year);
        expect(years[0]).toBeGreaterThan(years[1]);
        if (years.length > 2) expect(years[1]).toBeGreaterThan(years[2]);
    });

    it('hasData is false for forward-filled cells', () => {
        const asset = makeAsset([
            { date: '2024-01-01', value: 1000 },
            { date: '2024-04-01', value: 1100 },
        ]);
        const rows = calculateHeatmapData(asset);
        const row2024 = rows.find(r => r.year === 2024)!;
        // Feb (index 1) is forward-filled
        expect(row2024.cells[1]?.hasData).toBe(false);
        // Apr (index 3) has real data
        expect(row2024.cells[3]?.hasData).toBe(true);
    });

    it('cells before the asset inception are null', () => {
        // Asset starts in June 2024
        const asset = makeAsset([{ date: '2024-06-01', value: 1000 }]);
        const rows = calculateHeatmapData(asset);
        const row2024 = rows.find(r => r.year === 2024)!;
        // Months Jan-May (indices 0-4) should be null
        for (let i = 0; i < 5; i++) {
            expect(row2024.cells[i]).toBeNull();
        }
    });

    it('strictly-negative basis (withdrawal below holding) yields 0% for the cell', () => {
        // Jan holds 1000; Feb withdraws 1500, leaving value 0.
        // basis = prevValue(1000) + flow(-1500) = -500 (strictly negative).
        // The shared module guards basis <= 0 to 0%, instead of the old
        // basis !== 0 rule which divided by -500 and emitted a sign-flipped %.
        const asset = makeAsset([
            { date: '2024-01-01', value: 1000 },
            { date: '2024-02-01', value: 0, investmentChange: -1500 },
        ]);
        const rows = calculateHeatmapData(asset);
        const row2024 = rows.find(r => r.year === 2024)!;
        const febCell = row2024.cells[1];
        expect(febCell).not.toBeNull();
        expect(febCell?.changePercent).toBe(0);
        // change is still the cash-flow-adjusted delta: 0 - (1000 + -1500) = 500
        expect(febCell?.changeValue).toBe(500);
    });

    it('strictly-negative year basis yields 0% total return (via subPeriodReturn)', () => {
        // 2023 ends at 1000 (the year-start basis for 2024).
        // 2024 withdraws 1500 in January, leaving value 0 forward-filled.
        // yearBasis = startValue(1000) + totalFlow(-1500) = -500 (strictly negative).
        // Routed through subPeriodReturn this guards to 0%, not the old
        // sign-flipped (yearChange / -500) * 100.
        const asset = makeAsset([
            { date: '2023-12-01', value: 1000 },
            { date: '2024-01-01', value: 0, investmentChange: -1500 },
        ]);
        const rows = calculateHeatmapData(asset);
        const row2024 = rows.find(r => r.year === 2024)!;
        expect(row2024.startValue).toBe(1000);
        expect(row2024.totalReturn).toBe(0);
        // totalChange is still the cash-flow-adjusted delta: 0 - (1000 + -1500) = 500
        expect(row2024.totalChange).toBe(500);
    });

    it('startValue and endValue are set correctly on year rows', () => {
        const asset = makeAsset([
            { date: '2024-01-01', value: 1000 },
            { date: '2024-12-01', value: 1500 },
        ]);
        const rows = calculateHeatmapData(asset);
        const row2024 = rows.find(r => r.year === 2024)!;
        // startValue = value of Dec previous year (2023-12) = 0 (no data)
        expect(row2024.startValue).toBe(0);
        expect(row2024.endValue).toBe(1500);
    });
});
