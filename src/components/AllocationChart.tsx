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
    const { categories: categoryConfig, theme } = useSettings();
    const [viewMode, setViewMode] = useState<ViewMode>('category');

    // Auto-generate colors for investments
    const getInvestmentColor = (index: number) => {
        const isHighContrast = theme === 'high-contrast';
        if (isHighContrast) {
            const highContrastColors = [
                '#00FFFF', // Cyan
                '#FF00FF', // Magenta
                '#FFFF00', // Yellow
                '#00FF00', // Lime
                '#FF0000', // Red
                '#0000FF', // Blue
                '#FFFFFF', // White
                '#FFA500'  // Orange
            ];
            return highContrastColors[index % highContrastColors.length];
        }

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
            const getCategoryColor = (key: string) => {
                if (theme === 'high-contrast') {
                    // Map common categories to high contrast colors
                    switch (key) {
                        case 'stocks': return '#00FFFF'; // Cyan
                        case 'etf': return '#FFFF00'; // Yellow
                        case 'crypto': return '#FF00FF'; // Magenta
                        case 'cash': return '#00FF00'; // Lime
                        case 'realExp': return '#FF0000'; // Red
                        case 'bonds': return '#0000FF'; // Blue
                        default: return '#FFFFFF'; // White
                    }
                }
                return categoryConfig.find(c => c.key === key)?.color || '#999';
            };

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

    // specific border colors matching card backgrounds
    const borderColor = theme === 'light' ? '#FFFFFF' : (theme === 'high-contrast' ? '#000000' : '#16161A');

    // Theme-based tooltip styles
    const tooltipBg = theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : (theme === 'high-contrast' ? '#000000' : 'rgba(26, 26, 34, 0.95)');
    const tooltipTitleColor = theme === 'light' ? '#111827' : (theme === 'high-contrast' ? '#FFFFFF' : '#fff');
    const tooltipBodyColor = theme === 'light' ? '#4B5563' : (theme === 'high-contrast' ? '#FFFFFF' : '#9CA3AF');
    const tooltipBorderColor = theme === 'light' ? 'rgba(0,0,0,0.1)' : (theme === 'high-contrast' ? '#FFFFFF' : 'rgba(255,255,255,0.1)');
    const tooltipBorderWidth = theme === 'high-contrast' ? 2 : 1;

    const data = {
        labels: chartData.labels,
        datasets: [{
            data: chartData.data,
            backgroundColor: chartData.colors,
            borderColor: borderColor,
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
                backgroundColor: tooltipBg,
                titleColor: tooltipTitleColor,
                titleFont: { weight: theme === 'high-contrast' ? 'bold' : 'bold' } as any,
                bodyColor: tooltipBodyColor,
                bodyFont: { weight: theme === 'high-contrast' ? 'bold' : 'normal' } as any,
                borderColor: tooltipBorderColor,
                borderWidth: tooltipBorderWidth,
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
                boxPadding: 4,
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
                <div className="time-range-tabs">
                    <button
                        className={`time-tab ${viewMode === 'category' ? 'active' : ''}`}
                        onClick={() => setViewMode('category')}
                    >
                        Type
                    </button>
                    <button
                        className={`time-tab ${viewMode === 'investment' ? 'active' : ''}`}
                        onClick={() => setViewMode('investment')}
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
