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
    const { defaultDateRange, theme } = useSettings();
    const [timeRange, setTimeRange] = useState<TimeRange>(defaultDateRange || '1Y');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const { isHidden, formatAmount } = usePrivacy();
    const chartRef = useRef<Chart<'line'>>(null);

    // Theme-based colors
    // Theme-based colors
    const isHighContrast = theme === 'high-contrast';
    const textColor = theme === 'light' ? '#4B5563' : (isHighContrast ? '#ffff00' : '#9CA3AF');
    const gridColor = theme === 'light' ? 'rgba(0,0,0,0.05)' : (isHighContrast ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)');

    // Tooltip colors
    const tooltipBg = theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : (isHighContrast ? '#000000' : 'rgba(26, 26, 34, 0.95)');
    const tooltipText = theme === 'light' ? '#111827' : (isHighContrast ? '#ffffff' : '#fff');
    const tooltipBorder = theme === 'light' ? 'rgba(0,0,0,0.1)' : (isHighContrast ? '#ffffff' : 'rgba(255,255,255,0.1)');

    // Cleanup chart on unmount to prevent tooltip persistence
    useEffect(() => {
        const chart = chartRef.current;
        return () => {
            if (chart) {
                chart.destroy();
            }
        };
    }, []);

    // ... (logic remains same until options) ...

    // Aggregate all value histories into a combined timeline
    // OPTIMIZED: Pre-process histories once, then iterate dates efficiently
    const aggregateHistory = () => {
        if (assets.length === 0) return [];

        const now = new Date();
        const nowStr = now.toISOString().split('T')[0];

        // Pre-process: Sort each asset's history ONCE and compute running invested totals
        const processedAssets = assets.map(asset => {
            const history = asset.valueHistory || [];
            const sortedHistory = [...history]
                .map(e => ({
                    ...e,
                    dateStr: e.date.split('T')[0]
                }))
                .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

            // Pre-compute running invested totals for binary search
            let runningInvested = 0;
            const withRunningTotals = sortedHistory.map(entry => {
                runningInvested += entry.investmentChange || 0;
                return { ...entry, runningInvested };
            });

            return { sortedHistory: withRunningTotals };
        });

        // Collect all unique dates
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

        // Binary search helper: find largest index where entry.dateStr <= target
        const findLatestEntryIndex = (history: { dateStr: string }[], targetDate: string): number => {
            let left = 0, right = history.length - 1, result = -1;
            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                if (history[mid].dateStr <= targetDate) {
                    result = mid;
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            }
            return result;
        };

        // Map dates efficiently using binary search
        return filteredDates.map(date => {
            let totalValue = 0;
            let totalInvested = 0;

            processedAssets.forEach(({ sortedHistory }) => {
                const idx = findLatestEntryIndex(sortedHistory, date);
                if (idx >= 0) {
                    totalValue += sortedHistory[idx].value;
                    totalInvested += sortedHistory[idx].runningInvested;
                }
            });

            return { date, value: totalValue, invested: totalInvested };
        });
    };

    const history = aggregateHistory();

    const currentValue = history.length > 0 ? history[history.length - 1].value : 0;
    const currentInvested = history.length > 0 ? history[history.length - 1].invested : 0;
    const startValue = history.length > 0 ? history[0].value : 0;
    const startInvested = history.length > 0 ? history[0].invested : 0;

    // Calculate gain/loss for the selected period
    const startTotalGain = startValue - startInvested;
    const endTotalGain = currentValue - currentInvested;
    const calculatedGain = endTotalGain - startTotalGain;

    // Calculate ROI for the period
    // Formula: Period Gain / (Start Value + Net New Investment)
    // Denominator represents the effective capital at risk during the period
    const investedChange = currentInvested - startInvested;
    const averageCapital = startValue + investedChange; // Simplified "Ending Principal"

    // Fallback for MAX to use stats if available (for precise All-Time numbers), otherwise calculated
    const isMax = timeRange === 'MAX';
    const displayGain = isMax && stats ? stats.totalGain : calculatedGain;

    let displayGainPercent = 0;
    if (isMax && stats) {
        displayGainPercent = stats.gainPercentage;
    } else {
        displayGainPercent = averageCapital > 0 ? (calculatedGain / averageCapital) * 100 : 0;
    }

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
                borderColor: isHighContrast ? '#00FFFF' : '#00D9A5', // Cyan in HC
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const chartArea = context.chart.chartArea;
                    if (!chartArea) return 'transparent';

                    if (isHighContrast) return 'transparent'; // No fill in HC for clarity

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
                fill: !isHighContrast ? 'origin' : false,
                tension: 0.4,
                pointRadius: isHighContrast ? 4 : 0,
                pointBackgroundColor: isHighContrast ? '#000' : undefined,
                pointBorderWidth: isHighContrast ? 2 : 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: isHighContrast ? '#00FFFF' : '#00D9A5',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: isHighContrast ? 3 : 2
            },
            {
                label: 'Invested',
                data: isHidden ? normalizedInvestedData : history.map(h => h.invested),
                borderColor: isHighContrast ? '#FFFF00' : '#3B82F6', // Yellow in HC
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.4,
                pointRadius: isHighContrast ? 4 : 0,
                pointBackgroundColor: isHighContrast ? '#000' : undefined,
                pointBorderWidth: isHighContrast ? 2 : 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: isHighContrast ? '#FFFF00' : '#3B82F6',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: isHighContrast ? 3 : 2,
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
                    color: textColor,
                    font: { size: 11 },
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: tooltipBg,
                titleColor: tooltipText,
                bodyColor: '#00D9A5',
                borderColor: tooltipBorder,
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    title: (tooltipItems: any) => {
                        if (!tooltipItems || !tooltipItems.length) return '';
                        const d = new Date(history[tooltipItems[0].dataIndex].date);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelTextColor: (context: any) => {
                        if (theme === 'light') {
                            if (context.datasetIndex === 0) return '#059669'; // Darker Green for Value
                            if (context.datasetIndex === 1) return '#2563EB'; // Darker Blue for Invested
                        }
                        if (isHighContrast) {
                            if (context.datasetIndex === 0) return '#00FFFF'; // Cyan
                            if (context.datasetIndex === 1) return '#FFFF00'; // Yellow
                        }
                        return context.dataset.borderColor;
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                footerColor: (context: any) => {
                    if (!context.tooltipItems || !context.tooltipItems.length) return '#fff';
                    const index = context.tooltipItems[0].dataIndex;
                    const item = history[index];
                    if (!item) return '#fff';

                    const isPositive = item.value >= item.invested;
                    if (isHighContrast) {
                        return isPositive ? '#00FF00' : '#FF0000'; // Neon Green/Red
                    }
                    return isPositive ? '#10B981' : '#EF4444'; // Standard Green/Red
                },
                footerFont: {
                    weight: 'bold' as const
                }
            }
        },
        scales: {
            x: {
                display: true,
                grid: { display: false },
                ticks: {
                    color: textColor,
                    font: { size: 10 },
                    maxTicksLimit: 6
                },
                border: { display: false }
            },
            y: {
                display: true,
                grid: {
                    color: gridColor,
                    drawBorder: false
                },
                ticks: {
                    color: textColor,
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
