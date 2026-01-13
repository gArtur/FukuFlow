import type { HeatmapRow } from './types';
import { calculateVolatility } from './heatmapUtils';

interface HeatmapStatsProps {
    portfolioRow: HeatmapRow;
}

export default function HeatmapStats({ portfolioRow }: HeatmapStatsProps) {
    // Calculate Volatility (Std Dev of monthly returns)
    const monthlyReturns = portfolioRow.cells.filter(c => c.exists).map(c => c.changePercent);

    const volatility = calculateVolatility(monthlyReturns);
    const bestMonth = monthlyReturns.length > 0 ? Math.max(...monthlyReturns) : 0;
    const worstMonth = monthlyReturns.length > 0 ? Math.min(...monthlyReturns) : 0;

    return (
        <div className="stats-row heatmap-stats">
            <div className="stat-card">
                <div className="stat-card-label">Total Return</div>
                <div
                    className="stat-card-value"
                    style={{
                        color:
                            portfolioRow.totalChange >= 0
                                ? 'var(--accent-green)'
                                : 'var(--accent-red)',
                    }}
                >
                    {portfolioRow.totalChangePercent >= 0 ? '+' : ''}
                    {portfolioRow.totalChangePercent.toFixed(1)}%
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-card-label">Volatility</div>
                <div className="stat-card-value">{volatility.toFixed(1)}%</div>
            </div>
            <div className="stat-card">
                <div className="stat-card-label">Best Month</div>
                <div className="stat-card-value" style={{ color: 'var(--accent-green)' }}>
                    {bestMonth >= 0 ? '+' : ''}
                    {bestMonth.toFixed(1)}%
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-card-label">Worst Month</div>
                <div className="stat-card-value" style={{ color: 'var(--accent-red)' }}>
                    {worstMonth >= 0 ? '+' : ''}
                    {worstMonth.toFixed(1)}%
                </div>
            </div>
        </div>
    );
}
