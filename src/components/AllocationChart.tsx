import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import type { PortfolioStats, AssetCategory } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import { usePrivacy } from '../contexts/PrivacyContext';

ChartJS.register(ArcElement, Tooltip);

interface AllocationChartProps {
    stats: PortfolioStats;
}

export default function AllocationChart({ stats }: AllocationChartProps) {
    const { isHidden, formatAmount } = usePrivacy();
    const categories = Object.keys(stats.byCategory) as AssetCategory[];
    const nonZeroCategories = categories.filter(cat => stats.byCategory[cat] > 0);

    if (nonZeroCategories.length === 0) {
        return (
            <div className="chart-card allocation-card">
                <div className="chart-header">
                    <h3 className="chart-title">Allocation</h3>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <p className="empty-text">Add investments to see allocation</p>
                </div>
            </div>
        );
    }

    const total = nonZeroCategories.reduce((acc, cat) => acc + stats.byCategory[cat], 0);

    const data = {
        labels: nonZeroCategories.map(cat => CATEGORY_LABELS[cat]),
        datasets: [{
            data: nonZeroCategories.map(cat => stats.byCategory[cat]),
            backgroundColor: nonZeroCategories.map(cat => CATEGORY_COLORS[cat]),
            borderColor: '#1A1A22',
            borderWidth: 3,
            hoverOffset: 8
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 34, 0.95)',
                titleColor: '#fff',
                bodyColor: '#9CA3AF',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: (context: { label: string; parsed: number }) => {
                        const value = context.parsed;
                        const percentage = ((value / total) * 100).toFixed(1);
                        if (isHidden) {
                            return `${percentage}%`;
                        }
                        return `${formatAmount(value)} (${percentage}%)`;
                    }
                }
            }
        }
    };

    return (
        <div className="chart-card allocation-card">
            <div className="chart-header">
                <h3 className="chart-title">Allocation</h3>
            </div>
            <div className="doughnut-container">
                <Doughnut data={data} options={options} />
                <div className="doughnut-center">
                    <div className="doughnut-center-value">{formatAmount(stats.totalValue)}</div>
                    <div className="doughnut-center-label">Total</div>
                </div>
            </div>
            <div className="allocation-legend">
                {nonZeroCategories.map(cat => {
                    const percentage = ((stats.byCategory[cat] / total) * 100).toFixed(1);
                    return (
                        <div key={cat} className="allocation-legend-item">
                            <span
                                className="allocation-legend-dot"
                                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                            />
                            <span className="allocation-legend-label">{CATEGORY_LABELS[cat]}</span>
                            <span className="allocation-legend-percent">{percentage}%</span>
                            <span className="allocation-legend-value">{formatAmount(stats.byCategory[cat])}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
