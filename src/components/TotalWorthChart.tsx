import { usePrivacy } from '../contexts/PrivacyContext';
import { useSettings } from '../contexts/SettingsContext';
import type { TimeRange, Asset } from '../types';

interface TotalWorthChartProps {
    assets: Asset[];
    timeRange: TimeRange;
    setTimeRange: (range: TimeRange) => void;
    customStartDate: string;
    setCustomStartDate: (date: string) => void;
    customEndDate: string;
    setCustomEndDate: (date: string) => void;
}

import { useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import type { Chart } from 'chart.js';
import { getDateRangeFromTimeRange } from '../utils/dateUtils';
import {
    calculatePerformance,
    calculateCAGR,
    calculateMaxDrawdown,
    calculateVolatilityFromHistory,
    toPeriodReturnSeries,
} from '../utils/performance';
import { useChartView } from '../hooks/useChartView';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

export default function TotalWorthChart({
    assets,
    timeRange,
    setTimeRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
}: TotalWorthChartProps) {
    const { theme } = useSettings();
    const { isHidden, formatAmount } = usePrivacy();
    const [view, setView] = useChartView();
    const isPerformance = view === 'performance';
    const chartRef = useRef<Chart<'line'>>(null);

    // Theme-based colors
    // Theme-based colors
    const isHighContrast = theme === 'high-contrast';
    const textColor = theme === 'light' ? '#4B5563' : isHighContrast ? '#ffff00' : '#9CA3AF';
    const gridColor =
        theme === 'light'
            ? 'rgba(0,0,0,0.05)'
            : isHighContrast
              ? 'rgba(255,255,255,0.2)'
              : 'rgba(255,255,255,0.05)';

    // Tooltip colors
    const tooltipBg =
        theme === 'light'
            ? 'rgba(255, 255, 255, 0.95)'
            : isHighContrast
              ? '#000000'
              : 'rgba(26, 26, 34, 0.95)';
    const tooltipText = theme === 'light' ? '#111827' : isHighContrast ? '#ffffff' : '#fff';
    const tooltipBorder =
        theme === 'light'
            ? 'rgba(0,0,0,0.1)'
            : isHighContrast
              ? '#ffffff'
              : 'rgba(255,255,255,0.1)';

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

    const { startDate, endDate } = getDateRangeFromTimeRange(
        timeRange,
        customStartDate,
        customEndDate
    );

    const {
        history,
        currentValue,
        calculatedGain,
        gainPercent: calculatedGainPercent,
    } = calculatePerformance(assets, startDate, endDate, timeRange !== 'MAX');

    // Header gain/% come from the same snapshot-history computation the chart plots,
    // in every range (incl. MAX), so the Performance line always lands on the header.
    const displayGain = calculatedGain;
    const displayGainPercent = calculatedGainPercent;

    const formatPercent = (value: number) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    };

    // Performance view: value line = period return rebased to 0% at the range start,
    // invested line = flat 0% baseline. Total Worth view: both lines in absolute
    // currency. Privacy masks figures separately.
    const performanceData = toPeriodReturnSeries(history);
    const baseGain = history.length > 0 ? history[0].value - history[0].invested : 0;
    const valueData = isPerformance ? performanceData : history.map(h => h.value);
    const investedData = isPerformance ? history.map(() => 0) : history.map(h => h.invested);

    // Gain/loss coloring: green where the Value line sits at/above the baseline,
    // red where it dips below. Baseline = the Invested dataset (flat 0% in
    // Performance view, the moving Invested line in Total Worth view).
    const positiveLine = isHighContrast ? '#00FFFF' : '#00D9A5';
    const negativeLine = isHighContrast ? '#00FFFF' : '#FF6B6B';
    const positiveFill = 'rgba(0, 217, 165, 0.25)';
    const negativeFill = 'rgba(255, 107, 107, 0.25)';
    const isBelowBaseline = (index: number | undefined) =>
        index != null && index >= 0 && valueData[index] < investedData[index];

    const data = {
        labels: history.map(h => {
            const d = new Date(h.date);
            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        }),
        datasets: [
            {
                label: 'Value',
                data: valueData,
                borderColor: positiveLine, // Cyan in HC; per-segment green/red below
                segment: isHighContrast
                    ? undefined
                    : {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          borderColor: (ctx: any) =>
                              isBelowBaseline(ctx.p1DataIndex) ? negativeLine : positiveLine,
                      },
                backgroundColor: positiveFill,
                // Shade the gain/loss band between Value and the Invested line (index 1):
                // green where Value is above the baseline, red where below. No fill in HC.
                fill: isHighContrast
                    ? false
                    : { target: 1, above: positiveFill, below: negativeFill },
                tension: 0.1,
                pointRadius: isHighContrast ? 4 : 0,
                pointBackgroundColor: isHighContrast ? '#000' : undefined,
                pointBorderWidth: isHighContrast ? 2 : 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: isHighContrast ? '#00FFFF' : '#00D9A5',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: isHighContrast ? 3 : 2,
            },
            {
                label: 'Invested',
                data: investedData,
                borderColor: isHighContrast ? '#FFFF00' : '#3B82F6', // Yellow in HC
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.1,
                pointRadius: isHighContrast ? 4 : 0,
                pointBackgroundColor: isHighContrast ? '#000' : undefined,
                pointBorderWidth: isHighContrast ? 2 : 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: isHighContrast ? '#FFFF00' : '#3B82F6',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: isHighContrast ? 3 : 2,
                borderDash: [5, 5],
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index' as const,
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
                    pointStyle: 'circle',
                },
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
                // In Performance view the Invested line is a flat 0% baseline — hide its
                // tooltip row so it doesn't show a redundant "Invested: 0%" every time.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filter: (item: any) => !(isPerformance && item.datasetIndex === 1),
                callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    title: (tooltipItems: any) => {
                        if (!tooltipItems || !tooltipItems.length) return '';
                        const d = new Date(history[tooltipItems[0].dataIndex].date);
                        return d.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        });
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: (context: any) => {
                        // Only show Value and Invested in labels
                        const index = context.dataIndex;
                        const item = history[index];
                        if (!item) return '';
                        if (context.datasetIndex === 0) {
                            return isPerformance
                                ? `Value: ${formatPercent(performanceData[index])}`
                                : `Value: ${formatAmount(item.value)}`;
                        } else if (context.datasetIndex === 1) {
                            // Filtered out in Performance view; only reached in Total Worth.
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

                        // Performance view is period-relative: gain since the range start.
                        // Gate the amount on the same basis as toPeriodReturnSeries so the
                        // amount and % never disagree at a non-positive period-start basis.
                        const periodBasis =
                            history.length > 0
                                ? history[0].value + (item.invested - history[0].invested)
                                : 0;
                        const gainLoss = isPerformance
                            ? periodBasis > 0
                                ? item.value - item.invested - baseGain
                                : 0
                            : item.value - item.invested;
                        const gainLossPercent = isPerformance
                            ? performanceData[index]
                            : item.invested > 0
                              ? (gainLoss / item.invested) * 100
                              : 0;
                        const sign = gainLoss >= 0 ? '+' : '';

                        if (isHidden) {
                            return `Gain/Loss: ${sign}${gainLossPercent.toFixed(2)}%`;
                        }

                        return `Gain/Loss: ${sign}${formatAmount(gainLoss)} (${sign}${gainLossPercent.toFixed(2)}%)`;
                    },
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                footerColor: (context: any) => {
                    if (!context.tooltipItems || !context.tooltipItems.length) return '#fff';
                    const index = context.tooltipItems[0].dataIndex;
                    const item = history[index];
                    if (!item) return '#fff';

                    const isPositive = isPerformance
                        ? item.value - item.invested - baseGain >= 0
                        : item.value >= item.invested;
                    if (isHighContrast) {
                        return isPositive ? '#00FF00' : '#FF0000'; // Neon Green/Red
                    }
                    return isPositive ? '#10B981' : '#EF4444'; // Standard Green/Red
                },
                footerFont: {
                    weight: 'bold' as const,
                },
            },
        },
        scales: {
            x: {
                display: true,
                grid: { display: false },
                ticks: {
                    color: textColor,
                    font: { size: 10 },
                    maxTicksLimit: 6,
                },
                border: { display: false },
            },
            y: {
                display: true,
                grid: {
                    color: gridColor,
                    drawBorder: false,
                },
                ticks: {
                    color: textColor,
                    font: { size: 10 },
                    callback: (value: number | string) => {
                        const num = typeof value === 'string' ? parseFloat(value) : value;
                        if (isPerformance) {
                            const sign = num >= 0 ? '+' : '';
                            return `${sign}${num.toFixed(0)}%`;
                        }
                        // Total Worth view shows currency; privacy masks the scale.
                        if (isHidden) return '•••';
                        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                        return num;
                    },
                },
                border: { display: false },
            },
        },
    };

    return (
        <div className="chart-card total-worth-card" data-testid="total-worth-chart">
            <div className="chart-header">
                <div className="chart-header-left">
                    <div className="view-toggle" role="group" aria-label="Chart view">
                        <button
                            className={`view-tab ${!isPerformance ? 'active' : ''}`}
                            onClick={() => setView('totalWorth')}
                            aria-pressed={!isPerformance}
                            data-testid="view-total-worth"
                        >
                            Total Worth
                        </button>
                        <button
                            className={`view-tab ${isPerformance ? 'active' : ''}`}
                            onClick={() => setView('performance')}
                            aria-pressed={isPerformance}
                            data-testid="view-performance"
                        >
                            Performance
                        </button>
                    </div>
                    <div className="chart-value" data-testid="total-worth-value">
                        {formatAmount(currentValue)}
                    </div>
                    <div className={`chart-change ${displayGain >= 0 ? 'positive' : 'negative'}`}>
                        <span>{formatAmount(Math.abs(displayGain))}</span>
                        <span className="chart-change-percent">
                            {formatPercent(displayGainPercent)}
                        </span>
                    </div>
                </div>
                <div className="chart-header-right">
                    <div className="time-range-tabs" data-testid="time-range-tabs">
                        {(['YTD', '1Y', '5Y', 'MAX', 'Custom'] as TimeRange[]).map(range => (
                            <button
                                key={range}
                                className={`time-tab ${timeRange === range ? 'active' : ''}`}
                                onClick={() => setTimeRange(range)}
                                data-testid={`time-range-${range}`}
                                aria-pressed={timeRange === range}
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
                                    onChange={e => setCustomStartDate(e.target.value)}
                                    className="date-input"
                                />
                            </div>
                            <div className="date-input-group">
                                <label htmlFor="end-date">To:</label>
                                <input
                                    type="date"
                                    id="end-date"
                                    value={customEndDate}
                                    onChange={e => setCustomEndDate(e.target.value)}
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
                        <p className="empty-text">
                            Add more investments or updates to see performance over time
                        </p>
                    </div>
                )}
            </div>
            <div className="chart-metrics-row" data-testid="chart-metrics-row">
                <div className="chart-metric">
                    <span
                        className="chart-metric-label"
                        title="Compound Annual Growth Rate — annualised return"
                    >
                        CAGR
                    </span>
                    <span
                        className={`chart-metric-value ${calculateCAGR(history, displayGainPercent) >= 0 ? 'positive' : 'negative'}`}
                    >
                        {history.length < 2
                            ? '—'
                            : formatPercent(calculateCAGR(history, displayGainPercent))}
                    </span>
                </div>
                <div className="chart-metric">
                    <span
                        className="chart-metric-label"
                        title="Largest peak-to-trough decline in portfolio value"
                    >
                        <span className="metric-label-full">Max Drawdown</span>
                        <span className="metric-label-short">Max DD</span>
                    </span>
                    <span className="chart-metric-value negative">
                        {(() => {
                            const dd = calculateMaxDrawdown(history);
                            return dd === null ? '—' : `${dd.toFixed(1)}%`;
                        })()}
                    </span>
                </div>
                <div className="chart-metric">
                    <span
                        className="chart-metric-label"
                        title="Standard deviation of returns — a measure of risk"
                    >
                        Volatility
                    </span>
                    <span className="chart-metric-value risk">
                        {history.length < 2
                            ? '—'
                            : `${calculateVolatilityFromHistory(history).toFixed(1)}%`}
                    </span>
                </div>
            </div>
        </div>
    );
}
