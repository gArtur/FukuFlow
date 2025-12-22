import { useMemo } from 'react';
import type { ValueEntry } from '../types';

/**
 * Enhanced snapshot with calculated metrics
 */
export interface EnhancedSnapshot extends ValueEntry {
    cumInvested: number;      // Cumulative invested amount
    periodGL: number;         // Period gain/loss
    periodGLPercent: number;  // Period gain/loss percentage
    cumGL: number;            // Cumulative gain/loss
    roi: number;              // Return on investment percentage
    ytdGL: number;            // Year-to-date gain/loss
    ytdROI: number;           // Year-to-date ROI percentage
    actualIndex: number;      // Original index in sorted array
}

/**
 * Hook to process value history and add derived financial metrics.
 * Calculates period G/L, cumulative G/L, ROI, and YTD metrics for each snapshot.
 * 
 * @param valueHistory - Raw value history from asset
 * @returns Enhanced history sorted most recent first
 */
export function useSnapshotHistory(valueHistory: ValueEntry[] | undefined): EnhancedSnapshot[] {
    return useMemo(() => {
        if (!valueHistory || valueHistory.length === 0) {
            return [];
        }

        const sortedHistory = [...valueHistory].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        let runningInvested = 0;

        // Build map of year start values and invested amounts for YTD calculations
        const yearStartData: Map<number, { value: number; invested: number }> = new Map();
        let tempInvested = 0;
        for (const entry of sortedHistory) {
            const year = new Date(entry.date).getFullYear();
            const investChange = entry.investmentChange || 0;
            tempInvested += investChange;
            if (!yearStartData.has(year)) {
                // First entry of the year - use previous value as starting point
                const idx = sortedHistory.indexOf(entry);
                const prevEntry = idx > 0 ? sortedHistory[idx - 1] : null;
                yearStartData.set(year, {
                    value: prevEntry ? prevEntry.value : 0,
                    invested: tempInvested - investChange
                });
            }
        }

        const enhanced = sortedHistory.map((entry, index) => {
            const prevEntry = index > 0 ? sortedHistory[index - 1] : null;
            const investChange = entry.investmentChange || 0;

            // Update running invested amount
            runningInvested += investChange;

            // Period Gain/Loss: (Current Value - Previous Value) - Net Investment Change
            const prevValue = prevEntry ? prevEntry.value : 0;
            const periodGL = (entry.value - prevValue) - investChange;

            // Period G/L Percent: PeriodGL / (StartValue + Flows)
            const basis = prevValue + investChange;
            let periodGLPercent = 0;
            if (basis !== 0) {
                periodGLPercent = (periodGL / basis) * 100;
            }

            // Cumulative G/L: Current Value - Cumulative Invested
            const cumGL = entry.value - runningInvested;

            // ROI: Cumulative G/L / Cumulative Invested
            let roi = 0;
            if (runningInvested > 0) {
                roi = (cumGL / runningInvested) * 100;
            }

            // YTD calculations
            const year = new Date(entry.date).getFullYear();
            const yearStart = yearStartData.get(year);
            let ytdGL = 0;
            let ytdROI = 0;
            if (yearStart) {
                // YTD G/L = Current cumulative G/L - Start of year cumulative G/L
                const startCumGL = yearStart.value - yearStart.invested;
                ytdGL = cumGL - startCumGL;

                // YTD ROI = YTD G/L / (Start of year value + investments during year)
                const ytdInvested = runningInvested - yearStart.invested;
                const ytdBasis = yearStart.value + ytdInvested;
                if (ytdBasis > 0) {
                    ytdROI = (ytdGL / ytdBasis) * 100;
                }
            }

            return {
                ...entry,
                cumInvested: runningInvested,
                periodGL,
                periodGLPercent,
                cumGL,
                roi,
                ytdGL,
                ytdROI,
                actualIndex: index
            };
        });

        // Most recent first
        return enhanced.reverse();
    }, [valueHistory]);
}
