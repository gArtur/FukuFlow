import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSnapshotHistory } from '../../hooks/useSnapshotHistory';
import type { ValueEntry } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function entry(date: string, value: number, investmentChange = 0, notes = ''): ValueEntry {
    return { id: undefined, date, value, investmentChange, notes };
}

// ─── Basic cases ──────────────────────────────────────────────────────────────

describe('useSnapshotHistory', () => {
    it('returns [] for undefined history', () => {
        const { result } = renderHook(() => useSnapshotHistory(undefined));
        expect(result.current).toEqual([]);
    });

    it('returns [] for empty history', () => {
        const { result } = renderHook(() => useSnapshotHistory([]));
        expect(result.current).toEqual([]);
    });

    it('output is sorted newest-first', () => {
        const history = [
            entry('2024-01-01', 1000, 1000),
            entry('2024-03-01', 1200, 0),
            entry('2024-02-01', 1100, 0),
        ];
        const { result } = renderHook(() => useSnapshotHistory(history));
        const dates = result.current.map(e => e.date);
        expect(new Date(dates[0]).getTime()).toBeGreaterThan(new Date(dates[1]).getTime());
        expect(new Date(dates[1]).getTime()).toBeGreaterThan(new Date(dates[2]).getTime());
    });

    // ─── Single entry ──────────────────────────────────────────────────────────

    describe('single entry', () => {
        it('cumInvested equals the entry investmentChange', () => {
            const { result } = renderHook(() =>
                useSnapshotHistory([entry('2024-01-01', 1000, 1000)])
            );
            expect(result.current[0].cumInvested).toBe(1000);
        });

        it('cumGL = value - cumInvested', () => {
            const { result } = renderHook(() =>
                useSnapshotHistory([entry('2024-01-01', 1000, 1000)])
            );
            expect(result.current[0].cumGL).toBe(0); // 1000 - 1000
        });

        it('roi = 0 when no gain on first entry', () => {
            const { result } = renderHook(() =>
                useSnapshotHistory([entry('2024-01-01', 1000, 1000)])
            );
            expect(result.current[0].roi).toBe(0);
        });
    });

    // ─── Two entries, no investment change ────────────────────────────────────

    describe('two entries without investmentChange', () => {
        const history = [entry('2024-01-01', 1000, 1000), entry('2024-06-01', 1200, 0)];

        it('periodGL = value2 - value1 - flow', () => {
            const { result } = renderHook(() => useSnapshotHistory(history));
            // Newest first: index 0 = Jun, index 1 = Jan
            const junEntry = result.current[0];
            expect(junEntry.periodGL).toBe(200); // 1200 - 1000 - 0
        });

        it('periodGLPercent = periodGL / (prevValue + flow) * 100', () => {
            const { result } = renderHook(() => useSnapshotHistory(history));
            const junEntry = result.current[0];
            expect(junEntry.periodGLPercent).toBeCloseTo(20); // 200/1000*100
        });

        it('cumGL = value - cumInvested at the Jun entry', () => {
            const { result } = renderHook(() => useSnapshotHistory(history));
            // cumInvested is still 1000 (no additional investment in June)
            expect(result.current[0].cumGL).toBe(200);
        });

        it('roi = cumGL / cumInvested * 100', () => {
            const { result } = renderHook(() => useSnapshotHistory(history));
            expect(result.current[0].roi).toBeCloseTo(20);
        });
    });

    // ─── Two entries with investmentChange ────────────────────────────────────

    describe('two entries with investmentChange on second', () => {
        const history = [
            entry('2024-01-01', 1000, 1000),
            entry('2024-06-01', 1400, 200), // added 200, grew by 200 → no actual gain
        ];

        it('cumInvested accumulates investment changes', () => {
            const { result } = renderHook(() => useSnapshotHistory(history));
            expect(result.current[0].cumInvested).toBe(1200); // 1000 + 200
        });

        it('periodGL subtracts the flow', () => {
            const { result } = renderHook(() => useSnapshotHistory(history));
            // value=1400, prevValue=1000, flow=200 → periodGL = 1400-1000-200 = 200
            expect(result.current[0].periodGL).toBe(200);
        });

        it('basis for periodGLPercent includes flow', () => {
            const { result } = renderHook(() => useSnapshotHistory(history));
            // basis = prevValue(1000) + flow(200) = 1200
            // periodGLPercent = 200/1200*100 ≈ 16.67%
            expect(result.current[0].periodGLPercent).toBeCloseTo(16.667, 2);
        });
    });

    // ─── Loss scenario ────────────────────────────────────────────────────────

    describe('loss scenario', () => {
        const history = [entry('2024-01-01', 1000, 1000), entry('2024-06-01', 800, 0)];

        it('periodGL is negative for a loss', () => {
            const { result } = renderHook(() => useSnapshotHistory(history));
            expect(result.current[0].periodGL).toBe(-200);
        });

        it('roi is negative', () => {
            const { result } = renderHook(() => useSnapshotHistory(history));
            expect(result.current[0].roi).toBeLessThan(0);
        });

        it('cumGL is negative', () => {
            const { result } = renderHook(() => useSnapshotHistory(history));
            expect(result.current[0].cumGL).toBe(-200);
        });
    });

    // ─── YTD calculations ─────────────────────────────────────────────────────

    describe('YTD calculations spanning a year boundary', () => {
        const history = [
            entry('2023-06-01', 1000, 1000), // Previous year
            entry('2024-01-15', 1050, 0), // New year - first entry
            entry('2024-06-01', 1200, 0), // New year - second entry
        ];

        it('ytdGL for the first entry in a new year references previous year end value', () => {
            const { result } = renderHook(() => useSnapshotHistory(history));
            // Newest first: [Jun 2024, Jan 2024, Jun 2023]
            const jan2024 = result.current[1];
            // yearStart for 2024 = prevEntry (Jun 2023): value=1000, invested=1000
            // startCumGL = 1000 - 1000 = 0
            // cumGL at Jan 2024 = 1050 - 1000 = 50
            // ytdGL = 50 - 0 = 50
            expect(jan2024.ytdGL).toBeCloseTo(50);
        });

        it('ytdGL for the last entry of the year includes full year appreciation', () => {
            const { result } = renderHook(() => useSnapshotHistory(history));
            const jun2024 = result.current[0];
            // cumGL at Jun 2024 = 1200 - 1000 = 200
            // startCumGL (start of 2024) = 0
            // ytdGL = 200 - 0 = 200
            expect(jun2024.ytdGL).toBeCloseTo(200);
        });
    });

    // ─── Memoization ─────────────────────────────────────────────────────────

    it('returns the same reference for the same input array reference', () => {
        const history = [entry('2024-01-01', 1000, 1000)];
        const { result, rerender } = renderHook(
            ({ h }: { h: ValueEntry[] }) => useSnapshotHistory(h),
            { initialProps: { h: history } }
        );
        const first = result.current;
        rerender({ h: history }); // same reference
        expect(result.current).toBe(first);
    });
});
