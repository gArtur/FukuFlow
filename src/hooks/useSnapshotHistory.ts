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
    actualIndex: number;      // Original index in sorted array
}

/**
 * Hook to process value history and add derived financial metrics.
 * Calculates period G/L, cumulative G/L, and ROI for each snapshot.
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

            return {
                ...entry,
                cumInvested: runningInvested,
                periodGL,
                periodGLPercent,
                cumGL,
                roi,
                actualIndex: index
            };
        });

        // Most recent first
        return enhanced.reverse();
    }, [valueHistory]);
}
