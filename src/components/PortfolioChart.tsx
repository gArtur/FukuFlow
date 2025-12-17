import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { PortfolioStats, AssetCategory } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PortfolioChartProps {
    stats: PortfolioStats;
}

export default function PortfolioChart({ stats }: PortfolioChartProps) {
    const categories = Object.keys(stats.byCategory) as AssetCategory[];
    const nonZeroCategories = categories.filter(cat => stats.byCategory[cat] > 0);

    if (nonZeroCategories.length === 0) {
        return (
            <section className="chart-section">
                <div className="chart-card">
                    <h3 className="chart-title">Asset Allocation</h3>
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <p className="empty-text">Add investments to see allocation</p>
                    </div>
                </div>
            </section>
        );
    }

    const data = {
        labels: nonZeroCategories.map(cat => CATEGORY_LABELS[cat]),
        datasets: [{
            data: nonZeroCategories.map(cat => stats.byCategory[cat]),
            backgroundColor: nonZeroCategories.map(cat => CATEGORY_COLORS[cat]),
            borderColor: 'rgba(0,0,0,0.3)',
            borderWidth: 2,
            hoverOffset: 8
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: {
                display: false
            },
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
                        const total = nonZeroCategories.reduce((acc, cat) => acc + stats.byCategory[cat], 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(value)} (${percentage}%)`;
                    }
                }
            }
        }
    };

    return (
        <section className="chart-section">
            <div className="chart-card">
                <h3 className="chart-title">Asset Allocation</h3>
                <div className="chart-container">
                    <Doughnut data={data} options={options} />
                </div>
                <div className="chart-legend">
                    {nonZeroCategories.map(cat => (
                        <div key={cat} className="chart-legend-item">
                            <span
                                className="chart-legend-dot"
                                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                            />
                            <span>{CATEGORY_LABELS[cat]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
