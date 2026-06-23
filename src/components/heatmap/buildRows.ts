import type { Asset } from '../../types';
import { getPreviousMonth } from '../../utils/dateUtils';
import { getAssetTimeline } from '../../utils/heatmapLogic';
import { subPeriodReturn } from '../../utils/subPeriodReturn';
import type { HeatmapCell, HeatmapRow } from './types';

/**
 * Build one asset's heatmap row: a Sub-period Return cell per visible month plus
 * the asset's range total. Pure - the per-asset derivation the portfolio heatmap
 * renders. Months the asset did not exist in are emitted as empty cells
 * (exists: false). The range total's basis is the first visible cell's
 * previousValue, unless that first cell is the asset's inception month.
 *
 * ownerName is resolved by the caller so the builder stays free of the persons
 * lookup.
 */
export function buildAssetHeatmapRow(
    asset: Asset,
    visibleMonths: string[],
    maxMonth: string,
    ownerName: string
): HeatmapRow {
    const timeline = getAssetTimeline(asset, maxMonth);
    const sortedTimelineKeys = Array.from(timeline.keys()).sort();
    const firstDataMonth = sortedTimelineKeys.length > 0 ? sortedTimelineKeys[0] : null;

    const cells: HeatmapCell[] = visibleMonths.map(month => {
        const isInception = month === firstDataMonth;
        const entry = timeline.get(month);
        const prevValue = timeline.get(getPreviousMonth(month))?.value ?? 0;

        if (entry) {
            const flow = entry.flow;
            const { change, returnPercent: changePercent } = subPeriodReturn(
                prevValue,
                entry.value,
                flow
            );

            return {
                month,
                value: entry.value,
                previousValue: prevValue,
                change,
                changePercent,
                hasData: entry.realDataExists,
                exists: true,
                isInception,
                monthlyFlow: flow,
            };
        }

        return {
            month,
            value: 0,
            previousValue: 0,
            change: 0,
            changePercent: 0,
            hasData: false,
            exists: false,
            isInception: false,
            monthlyFlow: 0,
        };
    });

    const totalChange = cells.reduce((sum, c) => sum + c.change, 0);
    const totalFlow = cells.reduce((sum, c) => sum + (c.monthlyFlow ?? 0), 0);
    const startValueBasis = cells.length > 0 && !cells[0].isInception ? cells[0].previousValue : 0;
    const endValue = cells.length > 0 ? cells[cells.length - 1].value : asset.currentValue;
    const { returnPercent: totalChangePercent } = subPeriodReturn(
        startValueBasis,
        endValue,
        totalFlow
    );

    return {
        id: asset.id,
        name: asset.name,
        category: asset.category,
        ownerName,
        cells,
        totalChange,
        totalChangePercent,
        startValue: cells.length > 0 ? cells[0].previousValue : 0,
        endValue,
    };
}

/**
 * Build the TOTAL PORTFOLIO row by aggregating the per-asset rows column-wise:
 * each month sums the value, previousValue, flow and change across every asset's
 * cell at that index, then takes the portfolio Sub-period Return of the totals.
 * Pure. Expects rows whose cells align to the same visibleMonths.
 *
 * The range total's basis sums each asset's first-cell previousValue, skipping
 * assets whose first visible cell is their inception month (no prior basis).
 */
export function buildPortfolioHeatmapRow(rows: HeatmapRow[], visibleMonths: string[]): HeatmapRow {
    const cells: HeatmapCell[] = visibleMonths.map((month, index) => {
        let totalValue = 0;
        let totalPreviousValue = 0;
        let totalFlow = 0;
        let totalChange = 0;
        let hasAnyData = false;

        rows.forEach(row => {
            const cell = row.cells[index];
            if (cell) {
                totalValue += cell.value;
                totalPreviousValue += cell.previousValue;
                totalFlow += cell.monthlyFlow ?? 0;
                totalChange += cell.change;
                if (cell.hasData) hasAnyData = true;
            }
        });

        const { returnPercent: changePercent } = subPeriodReturn(
            totalPreviousValue,
            totalValue,
            totalFlow
        );

        return {
            month,
            value: totalValue,
            previousValue: totalPreviousValue,
            change: totalChange,
            changePercent,
            hasData: hasAnyData,
            exists: true,
            isInception: false,
        };
    });

    const totalChange = cells.reduce((sum, c) => sum + c.change, 0);
    let initialPortfolioBasis = 0;
    let totalFlowInRange = 0;

    rows.forEach(row => {
        if (row.cells.length > 0) {
            const firstCell = row.cells[0];
            if (!firstCell.isInception && firstCell.exists) {
                initialPortfolioBasis += firstCell.previousValue;
            }
            row.cells.forEach(cell => {
                totalFlowInRange += cell.monthlyFlow ?? 0;
            });
        }
    });

    const endValue = cells.length > 0 ? cells[cells.length - 1].value : 0;
    const { returnPercent: totalChangePercent } = subPeriodReturn(
        initialPortfolioBasis,
        endValue,
        totalFlowInRange
    );

    return {
        id: 'portfolio-total',
        name: 'TOTAL PORTFOLIO',
        category: 'Total',
        ownerName: 'Portfolio',
        cells,
        totalChange,
        totalChangePercent,
        startValue: initialPortfolioBasis,
        endValue,
    };
}
