import { useState, useRef, useEffect, useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import type { Chart } from 'chart.js';
import type { PortfolioStats, AssetCategory, Asset, Person } from '../types';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useSettings } from '../contexts/SettingsContext';

ChartJS.register(ArcElement, Tooltip);

interface AllocationChartProps {
    stats: PortfolioStats;
}

interface AllocationChartProps {
    stats: PortfolioStats;
    assets?: Asset[];
    persons?: Person[];
}

type ViewMode = 'category' | 'investment';

export default function AllocationChart({ stats, assets = [], persons = [] }: AllocationChartProps) {
    const { isHidden, formatAmount } = usePrivacy();
    const { categories: categoryConfig } = useSettings();
    const [viewMode, setViewMode] = useState<ViewMode>('category');

    // Auto-generate colors for investments
    const getInvestmentColor = (index: number) => {
        const colors = [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#06B6D4',
            '#84CC16', '#D946EF', '#EAB308', '#64748B', '#A855F7'
        ];
        return colors[index % colors.length];
    };

    const chartData = useMemo(() => {
        if (viewMode === 'category') {
            const categoryKeys = Object.keys(stats.byCategory) as AssetCategory[];
            const nonZeroCategories = categoryKeys.filter(cat => stats.byCategory[cat] > 0);

            // Helpers to get label and color
            const getCategoryLabel = (key: string) => categoryConfig.find(c => c.key === key)?.label || key;
            const getCategoryColor = (key: string) => categoryConfig.find(c => c.key === key)?.color || '#999';

            const total = nonZeroCategories.reduce((acc, cat) => acc + stats.byCategory[cat], 0);

            return {
                labels: nonZeroCategories.map(cat => getCategoryLabel(cat)),
                data: nonZeroCategories.map(cat => stats.byCategory[cat]),
                colors: nonZeroCategories.map(cat => getCategoryColor(cat)),
                total,
                items: nonZeroCategories.map(cat => ({
                    key: cat,
                    label: getCategoryLabel(cat),
                    value: stats.byCategory[cat],
                    color: getCategoryColor(cat),
                    percentage: ((stats.byCategory[cat] / total) * 100).toFixed(1)
                }))
            };
        } else {
            // Investment mode
            // Show individual assets, not grouped by name.

            const items = assets
                .filter(asset => asset.currentValue > 0)
                .sort((a, b) => b.currentValue - a.currentValue)
                .map((asset, i) => {
                    const isNameDuplicated = assets.filter(a => a.name === asset.name && a.currentValue > 0).length > 1;
                    let label = asset.name;

                    if (isNameDuplicated) {
                        const owner = persons.find(p => p.id === asset.ownerId);
                        if (owner) {
                            label = `${asset.name} (${owner.name})`;
                        }
                    }

                    return {
                        key: asset.id,
                        label,
                        value: asset.currentValue,
                        color: getInvestmentColor(i),
                        percentage: '' // calculated later
                    };
                });

            const total = items.reduce((acc, item) => acc + item.value, 0);

            // Calculate percentages
            items.forEach(item => {
                item.percentage = ((item.value / total) * 100).toFixed(1);
            });

            return {
                labels: items.map(item => item.label),
                data: items.map(item => item.value),
                colors: items.map(item => item.color),
                total,
                items
            };
        }
    }, [viewMode, stats, assets, categoryConfig, persons]);

    const chartRef = useRef<Chart<'doughnut'>>(null);

    // Cleanup chart on unmount to prevent tooltip persistence
    useEffect(() => {
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, []);

    if (chartData.items.length === 0) {
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

    const data = {
        labels: chartData.labels,
        datasets: [{
            data: chartData.data,
            backgroundColor: chartData.colors,
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
                        const percentage = ((value / chartData.total) * 100).toFixed(1);
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
            <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="chart-title">Allocation</h3>
                <div className="chart-toggle" style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '6px' }}>
                    <button
                        onClick={() => setViewMode('category')}
                        style={{
                            background: viewMode === 'category' ? 'var(--bg-primary)' : 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: viewMode === 'category' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: viewMode === 'category' ? 600 : 400,
                            boxShadow: viewMode === 'category' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        Type
                    </button>
                    <button
                        onClick={() => setViewMode('investment')}
                        style={{
                            background: viewMode === 'investment' ? 'var(--bg-primary)' : 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: viewMode === 'investment' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: viewMode === 'investment' ? 600 : 400,
                            boxShadow: viewMode === 'investment' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        Investments
                    </button>
                </div>
            </div>
            <div
                className="doughnut-container"
                onMouseLeave={() => {
                    if (chartRef.current) {
                        chartRef.current.setActiveElements([]);
                        chartRef.current.tooltip?.setActiveElements([], { x: 0, y: 0 });
                        chartRef.current.update();
                    }
                }}
            >
                <Doughnut ref={chartRef} data={data} options={options} />
                <div className="doughnut-center">
                    <div className="doughnut-center-value">{formatAmount(stats.totalValue)}</div>
                    <div className="doughnut-center-label">Total</div>
                </div>
            </div>
            <div className="allocation-legend">
                {chartData.items.map(item => (
                    <div key={item.key} className="allocation-legend-item">
                        <span
                            className="allocation-legend-dot"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="allocation-legend-label" title={item.label}>
                            {item.label}
                        </span>
                        <span className="allocation-legend-percent">{item.percentage}%</span>
                        <span className="allocation-legend-value">{formatAmount(item.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
