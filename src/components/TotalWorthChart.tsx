import { usePrivacy } from '../contexts/PrivacyContext';

interface TotalWorthChartProps {
    assets: {
        valueHistory: { date: string; value: number }[];
    }[];
}

type TimeRange = '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

import { useState } from 'react';
import { Line } from 'react-chartjs-2';
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

export default function TotalWorthChart({ assets }: TotalWorthChartProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
    const { isHidden, formatAmount } = usePrivacy();

    // Aggregate all value histories into a combined timeline
    const aggregateHistory = () => {
        if (assets.length === 0) return [];

        const now = new Date();
        const nowStr = now.toISOString().split('T')[0];

        // Ensure we always have today in the set of dates
        const allDates = new Set<string>();
        allDates.add(nowStr);

        assets.forEach(asset => {
            asset.valueHistory.forEach(entry => {
                allDates.add(entry.date.split('T')[0]);
            });
        });

        let startDate = new Date('2000-01-01');

        if (timeRange === '1M') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (timeRange === '3M') {
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        } else if (timeRange === '1Y') {
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        } else if (timeRange === 'YTD') {
            startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        if (timeRange !== 'ALL') {
            allDates.add(startDateStr);
        }

        const sortedDates = Array.from(allDates).sort();
        const filteredDates = sortedDates.filter(d => new Date(d) >= startDate);

        return filteredDates.map(date => {
            let total = 0;
            assets.forEach(asset => {
                const relevantEntries = asset.valueHistory
                    .filter(e => e.date.split('T')[0] <= date)
                    .sort((a, b) => b.date.localeCompare(a.date));

                if (relevantEntries.length > 0) {
                    total += relevantEntries[0].value;
                }
            });
            return { date, value: total };
        });
    };

    const history = aggregateHistory();
    const currentValue = history.length > 0 ? history[history.length - 1].value : 0;
    const startValue = history.length > 0 ? history[0].value : 0;
    const gain = currentValue - startValue;
    const gainPercent = startValue > 0 ? ((gain / startValue) * 100) : 0;

    // For privacy mode, normalize data to percentage changes from start
    const normalizedData = history.map(h => {
        if (startValue === 0) return 0;
        return ((h.value - startValue) / startValue) * 100;
    });

    const data = {
        labels: history.map(h => {
            const d = new Date(h.date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [{
            data: isHidden ? normalizedData : history.map(h => h.value),
            borderColor: '#00D9A5',
            backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D; chartArea: { top: number; bottom: number } } }) => {
                const ctx = context.chart.ctx;
                const chartArea = context.chart.chartArea;
                if (!chartArea) return 'transparent';
                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                gradient.addColorStop(0, 'rgba(0, 217, 165, 0.3)');
                gradient.addColorStop(1, 'rgba(0, 217, 165, 0)');
                return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#00D9A5',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            borderWidth: 2
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index' as const
        },
        plugins: {
            legend: { display: false },
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
                    label: (context: { parsed: { y: number | null }; dataIndex: number }) => {
                        const value = context.parsed.y ?? 0;
                        const index = context.dataIndex;

                        if (isHidden) {
                            const sign = value >= 0 ? '+' : '';
                            return `${sign}${value.toFixed(2)}%`;
                        } else {
                            const actualValue = history[index]?.value || 0;
                            const percentChange = startValue > 0
                                ? ((actualValue - startValue) / startValue) * 100
                                : 0;
                            const sign = percentChange >= 0 ? '+' : '';
                            return [
                                formatAmount(actualValue),
                                `${sign}${percentChange.toFixed(2)}% from start`
                            ];
                        }
                    }
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
                    <h3 className="chart-title">Total Worth</h3>
                    <div className="chart-value">{formatAmount(currentValue)}</div>
                    <div className={`chart-change ${gain >= 0 ? 'positive' : 'negative'}`}>
                        <span>{isHidden ? '' : formatAmount(Math.abs(gain))}</span>
                        <span className="chart-change-percent">{formatPercent(gainPercent)}</span>
                    </div>
                </div>
                <div className="time-range-tabs">
                    {(['1M', '3M', 'YTD', '1Y', 'ALL'] as TimeRange[]).map(range => (
                        <button
                            key={range}
                            className={`time-tab ${timeRange === range ? 'active' : ''}`}
                            onClick={() => setTimeRange(range)}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>
            <div className="line-chart-container">
                {history.length > 1 ? (
                    <Line data={data} options={options} />
                ) : (
                    <div className="empty-state">
                        <p className="empty-text">Add more investments or updates to see performance over time</p>
                    </div>
                )}
            </div>
        </div>
    );
}
