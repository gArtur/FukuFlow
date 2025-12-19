import { usePrivacy } from '../contexts/PrivacyContext';
import { useSettings } from '../contexts/SettingsContext';
import type { TimeRange } from '../types';


interface TotalWorthChartProps {
    assets: {
        valueHistory: { date: string; value: number; investmentChange?: number }[];
    }[];
    stats?: {
        totalGain: number;
        gainPercentage: number;
    };
    title?: string;
}

import { useState, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import type { Chart } from 'chart.js';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

export default function TotalWorthChart({ assets, stats, title = 'Total Worth' }: TotalWorthChartProps) {
    const { defaultDateRange } = useSettings();
    const [timeRange, setTimeRange] = useState<TimeRange>(defaultDateRange || '1Y');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const { isHidden, formatAmount } = usePrivacy();
    const chartRef = useRef<Chart<'line'>>(null);

    // Cleanup chart on unmount to prevent tooltip persistence
    useEffect(() => {
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, []);

    // Aggregate all value histories into a combined timeline
    const aggregateHistory = () => {
        if (assets.length === 0) return [];

        const now = new Date();
        const nowStr = now.toISOString().split('T')[0];

        // Ensure we always have today in the set of dates
        const allDates = new Set<string>();
        allDates.add(nowStr);

        assets.forEach(asset => {
            (asset.valueHistory || []).forEach(entry => {
                allDates.add(entry.date.split('T')[0]);
            });
        });

        let startDate = new Date('2000-01-01');
        let endDate = new Date();

        if (timeRange === '1Y') {
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        } else if (timeRange === '5Y') {
            startDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        } else if (timeRange === 'YTD') {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else if (timeRange === 'Custom' && customStartDate) {
            startDate = new Date(customStartDate);
            if (customEndDate) endDate = new Date(customEndDate);
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        if (timeRange !== 'MAX') {
            allDates.add(startDateStr);
        }

        const sortedDates = Array.from(allDates).sort();
        const filteredDates = sortedDates.filter(d => {
            const dateObj = new Date(d);
            return dateObj >= startDate && dateObj <= endDate;
        });

        return filteredDates.map(date => {
            let totalValue = 0;
            let totalInvested = 0;
            assets.forEach(asset => {
                // For Value: Find the latest entry on or before this date
                const relevantValueEntries = asset.valueHistory
                    .filter(e => e.date.split('T')[0] <= date)
                    .sort((a, b) => b.date.localeCompare(a.date));

                if (relevantValueEntries.length > 0) {
                    totalValue += relevantValueEntries[0].value;
                }

                // For Invested: Sum all investmentChange on or before this date
                const relevantInvestedEntries = asset.valueHistory
                    .filter(e => e.date.split('T')[0] <= date);

                totalInvested += relevantInvestedEntries.reduce((sum, entry) => sum + (entry.investmentChange || 0), 0);
            });
            return { date, value: totalValue, invested: totalInvested };
        });
    };

    const history = aggregateHistory();

    const currentValue = history.length > 0 ? history[history.length - 1].value : 0;
    const currentInvested = history.length > 0 ? history[history.length - 1].invested : 0;
    const startValue = history.length > 0 ? history[0].value : 0;
    const startInvested = history.length > 0 ? history[0].invested : 0;

    const displayGain = stats ? stats.totalGain : (currentValue - currentInvested);
    const displayGainPercent = stats ? stats.gainPercentage : (currentInvested > 0 ? (displayGain / currentInvested) * 100 : 0);

    // For privacy mode, normalize data to percentage changes from Start lnvested (to show ROI comparison)
    // If Start Invested is 0, fall back to Start Value to avoid divide by zero, or just show 0
    const baseline = startInvested > 0 ? startInvested : (startValue > 0 ? startValue : 1);

    const normalize = (val: number) => {
        return ((val - baseline) / baseline) * 100;
    };

    const normalizedValueData = history.map(h => normalize(h.value));
    const normalizedInvestedData = history.map(h => normalize(h.invested));

    const data = {
        labels: history.map(h => {
            const d = new Date(h.date);
            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }),
        datasets: [
            {
                label: 'Value',
                data: isHidden ? normalizedValueData : history.map(h => h.value),
                borderColor: '#00D9A5',
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const chartArea = context.chart.chartArea;
                    if (!chartArea) return 'transparent';

                    const { top, bottom } = chartArea;
                    const yAxis = context.chart.scales.y;

                    const gradient = ctx.createLinearGradient(0, top, 0, bottom);

                    if (!yAxis) {
                        gradient.addColorStop(0, 'rgba(0, 217, 165, 0.3)');
                        gradient.addColorStop(1, 'rgba(0, 217, 165, 0)');
                        return gradient;
                    }

                    const zeroPixel = yAxis.getPixelForValue(0);
                    const totalHeight = bottom - top;
                    let zeroStop = (zeroPixel - top) / totalHeight;

                    // Clamp to 0-1 range to handle cases where 0 is off-chart
                    zeroStop = Math.max(0, Math.min(1, zeroStop));

                    gradient.addColorStop(0, 'rgba(0, 217, 165, 0.3)');
                    gradient.addColorStop(zeroStop, 'rgba(0, 217, 165, 0)');
                    gradient.addColorStop(1, 'rgba(0, 217, 165, 0.3)');

                    return gradient;
                },
                fill: 'origin',
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#00D9A5',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: 2
            },
            {
                label: 'Invested',
                data: isHidden ? normalizedInvestedData : history.map(h => h.invested),
                borderColor: '#3B82F6',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#3B82F6',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: 2,
                borderDash: [5, 5]
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index' as const
        },

        plugins: {
            legend: {
                display: true,
                position: 'bottom' as const,
                labels: {
                    color: '#6B7280',
                    font: { size: 11 },
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(26, 26, 34, 0.95)',
                titleColor: '#fff',
                bodyColor: '#00D9A5',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    title: (tooltipItems: any) => {
                        if (!tooltipItems || !tooltipItems.length) return '';
                        const d = new Date(history[tooltipItems[0].dataIndex].date);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    },
                    label: (context: any) => {
                        // Only show Value and Invested in labels
                        if (context.datasetIndex === 0) {
                            const index = context.dataIndex;
                            const item = history[index];
                            if (!item) return '';
                            return `Value: ${formatAmount(item.value)}`;
                        } else if (context.datasetIndex === 1) {
                            const index = context.dataIndex;
                            const item = history[index];
                            if (!item) return '';
                            return `Invested: ${formatAmount(item.invested)}`;
                        }
                        return '';
                    },
                    footer: (tooltipItems: any) => {
                        if (!tooltipItems || !tooltipItems.length) return '';
                        const index = tooltipItems[0].dataIndex;
                        const item = history[index];
                        if (!item) return '';

                        const gainLoss = item.value - item.invested;
                        const gainLossPercent = item.invested > 0 ? (gainLoss / item.invested) * 100 : 0;
                        const sign = gainLoss >= 0 ? '+' : '';

                        if (isHidden) {
                            return `Gain/Loss: ${sign}${gainLossPercent.toFixed(2)}%`;
                        }

                        return `Gain/Loss: ${sign}${formatAmount(gainLoss)} (${sign}${gainLossPercent.toFixed(2)}%)`;
                    }
                },
                footerColor: (context: any) => {
                    if (!context.tooltipItems || !context.tooltipItems.length) return '#fff';
                    const index = context.tooltipItems[0].dataIndex;
                    const item = history[index];
                    if (!item) return '#fff';
                    return item.value >= item.invested ? '#10B981' : '#EF4444'; // Green or Red
                },
                footerFont: {
                    weight: 'bold' as any
                }
            }
        },
        scales: {
            x: {
                display: true,
                grid: { display: false },
                ticks: {
                    color: '#6B7280',
                    font: { size: 10 },
                    maxTicksLimit: 6
                },
                border: { display: false }
            },
            y: {
                display: true,
                grid: {
                    color: 'rgba(255,255,255,0.05)',
                    drawBorder: false
                },
                ticks: {
                    color: '#6B7280',
                    font: { size: 10 },
                    callback: (value: number | string) => {
                        const num = typeof value === 'string' ? parseFloat(value) : value;
                        if (isHidden) {
                            const sign = num >= 0 ? '+' : '';
                            return `${sign}${num.toFixed(0)}%`;
                        } else {
                            if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                            if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                            return num;
                        }
                    }
                },
                border: { display: false }
            }
        }
    };

    const formatPercent = (value: number) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    };

    return (
        <div className="chart-card total-worth-card">
            <div className="chart-header">
                <div className="chart-header-left">
                    <h3 className="chart-title">{title}</h3>
                    <div className="chart-value">{formatAmount(currentValue)}</div>
                    <div className={`chart-change ${displayGain >= 0 ? 'positive' : 'negative'}`}>
                        <span>{isHidden ? '' : formatAmount(Math.abs(displayGain))}</span>
                        <span className="chart-change-percent">{formatPercent(displayGainPercent)}</span>
                    </div>
                </div>
                <div className="chart-header-right">
                    <div className="time-range-tabs">
                        {(['YTD', '1Y', '5Y', 'MAX', 'Custom'] as TimeRange[]).map(range => (
                            <button
                                key={range}
                                className={`time-tab ${timeRange === range ? 'active' : ''}`}
                                onClick={() => setTimeRange(range)}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                    {timeRange === 'Custom' && (
                        <div className="custom-date-range">
                            <div className="date-input-group">
                                <label htmlFor="start-date">From:</label>
                                <input
                                    type="date"
                                    id="start-date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="date-input"
                                />
                            </div>
                            <div className="date-input-group">
                                <label htmlFor="end-date">To:</label>
                                <input
                                    type="date"
                                    id="end-date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="date-input"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div
                className="line-chart-container"
                onMouseLeave={() => {
                    if (chartRef.current) {
                        chartRef.current.setActiveElements([]);
                        chartRef.current.tooltip?.setActiveElements([], { x: 0, y: 0 });
                        chartRef.current.update();
                    }
                }}
            >
                {history.length > 1 ? (
                    <Line ref={chartRef} data={data} options={options} />
                ) : (
                    <div className="empty-state">
                        <p className="empty-text">Add more investments or updates to see performance over time</p>
                    </div>
                )}
            </div>
        </div>
    );
}
