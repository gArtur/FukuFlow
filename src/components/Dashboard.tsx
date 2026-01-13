import type { PortfolioStats } from '../types';
import { useFormatting } from '../hooks/useFormatting';

interface DashboardProps {
    stats: PortfolioStats;
    totalStats: PortfolioStats;
    isFiltered: boolean;
}

export default function Dashboard({ stats, totalStats, isFiltered }: DashboardProps) {
    const { formatCurrency, formatPercent } = useFormatting();
    const displayStats = stats;
    const isPositive = displayStats.totalGain >= 0;

    return (
        <section className="stats-section">
            <div className="stats-hero">
                <div className="stats-label">
                    {isFiltered ? 'Filtered Portfolio Value' : 'Total Net Worth'}
                </div>
                <div className="stats-value">{formatCurrency(displayStats.totalValue)}</div>
                <div className={`stats-change ${isPositive ? 'positive' : 'negative'}`}>
                    <span>{isPositive ? '↑' : '↓'}</span>
                    <span>{formatCurrency(Math.abs(displayStats.totalGain))}</span>
                    <span>({formatPercent(displayStats.gainPercentage)})</span>
                </div>
            </div>

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-card-label">Total Invested</div>
                    <div className="stat-card-value">
                        {formatCurrency(displayStats.totalInvested)}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-label">Total Gain/Loss</div>
                    <div
                        className="stat-card-value"
                        style={{ color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}
                    >
                        {formatCurrency(displayStats.totalGain)}
                    </div>
                </div>
            </div>

            {isFiltered && (
                <div className="stats-row" style={{ marginTop: 'var(--space-md)' }}>
                    <div className="stat-card">
                        <div className="stat-card-label">Family Total</div>
                        <div className="stat-card-value">
                            {formatCurrency(totalStats.totalValue)}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-label">Share of Total</div>
                        <div className="stat-card-value">
                            {totalStats.totalValue > 0
                                ? `${((displayStats.totalValue / totalStats.totalValue) * 100).toFixed(1)}%`
                                : '0%'}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
