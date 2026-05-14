import type { HeatmapRow } from './types';
import { calculateVolatility } from './heatmapUtils';

interface HeatmapStatsProps {
    portfolioRow: HeatmapRow;
}

export default function HeatmapStats({ portfolioRow }: HeatmapStatsProps) {
    const monthlyReturns = portfolioRow.cells.filter(c => c.exists).map(c => c.changePercent);

    const volatility = calculateVolatility(monthlyReturns);
    const bestMonth = monthlyReturns.length > 0 ? Math.max(...monthlyReturns) : 0;
    const worstMonth = monthlyReturns.length > 0 ? Math.min(...monthlyReturns) : 0;

    const totalReturn = portfolioRow.totalChangePercent;

    return (
        <div className="chart-metrics-row heatmap-stats-row">
            <div className="chart-metric">
                <span
                    className="chart-metric-label"
                    title="Percentage return on investment for the selected period"
                >
                    Total Return
                </span>
                <span
                    className={`chart-metric-value ${totalReturn >= 0 ? 'positive' : 'negative'}`}
                >
                    {totalReturn >= 0 ? '+' : ''}
                    {totalReturn.toFixed(1)}%
                </span>
            </div>
            <div className="chart-metric">
                <span
                    className="chart-metric-label"
                    title="Standard deviation of monthly returns — a measure of risk"
                >
                    Volatility
                </span>
                <span className="chart-metric-value risk">{volatility.toFixed(1)}%</span>
            </div>
            <div className="chart-metric">
                <span className="chart-metric-label" title="Best single-month return in the period">
                    Best Month
                </span>
                <span className="chart-metric-value positive">
                    {bestMonth >= 0 ? '+' : ''}
                    {bestMonth.toFixed(1)}%
                </span>
            </div>
            <div className="chart-metric">
                <span
                    className="chart-metric-label"
                    title="Worst single-month return in the period"
                >
                    Worst Month
                </span>
                <span className="chart-metric-value negative">
                    {worstMonth >= 0 ? '+' : ''}
                    {worstMonth.toFixed(1)}%
                </span>
            </div>
        </div>
    );
}
