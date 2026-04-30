import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
} from 'chart.js';
import type { Asset, Person, TimeRange } from '../types';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useSettings } from '../contexts/SettingsContext';
import { getDateRangeFromTimeRange } from '../utils/dateUtils';
import { calculatePerformance } from '../utils/performance';
import PersonBadge from './PersonBadge';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler);

interface AssetCardProps {
    asset: Asset;
    persons: Person[];
    onCardClick: (asset: Asset) => void;
    onAddSnapshot: (asset: Asset) => void;
    timeRange?: TimeRange;
    customStartDate?: string;
    customEndDate?: string;
}

export default function AssetCard({
    asset,
    persons,
    onCardClick,
    onAddSnapshot,
    timeRange,
    customStartDate,
    customEndDate,
}: AssetCardProps) {
    const { formatAmount, isHidden } = usePrivacy();
    const { categories, theme, assetsFollowGeneral } = useSettings();
    const [copied, setCopied] = useState(false);

    let gain = asset.currentValue - asset.purchaseAmount;
    let gainPercent =
        asset.purchaseAmount > 0 ? ((gain / asset.purchaseAmount) * 100).toFixed(1) : '0';
    let historyToUse = asset.valueHistory || [];

    if (assetsFollowGeneral && timeRange && timeRange !== 'MAX') {
        const { startDate, endDate } = getDateRangeFromTimeRange(
            timeRange,
            customStartDate,
            customEndDate
        );
        const perf = calculatePerformance([asset], startDate, endDate, true);
        gain = perf.calculatedGain;
        gainPercent = perf.gainPercent.toFixed(1);
        historyToUse = perf.history.map(h => ({
            date: h.date,
            value: h.value,
            investmentChange: 0,
        }));
    }

    const isPositive = gain >= 0;

    const owner = persons.find(p => p.id === asset.ownerId);
    const ownerName = owner?.name || 'Unknown';
    const categoryLabel = categories.find(c => c.key === asset.category)?.label || asset.category;

    // Theme-based colors for sparklines to ensure visibility
    const isLight = theme === 'light';
    const isHighContrast = theme === 'high-contrast';

    // In High Contrast, use Cyan for everything. In normal modes, use Green/Red.
    const positiveColor = isHighContrast ? '#00FFFF' : isLight ? '#10B981' : '#00D9A5';
    const negativeColor = isHighContrast ? '#00FFFF' : isLight ? '#EF4444' : '#FF6B6B';

    const sparklineData = {
        labels: historyToUse.map((_, i) => i.toString()),
        datasets: [
            {
                data: historyToUse.map(h => h.value),
                borderColor: isPositive ? positiveColor : negativeColor,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const chartArea = context.chart.chartArea;
                    if (!chartArea) return 'transparent';
                    const gradient = ctx.createLinearGradient(
                        0,
                        chartArea.top,
                        0,
                        chartArea.bottom
                    );
                    const color = isPositive ? positiveColor : negativeColor;

                    // Convert hex to rgba for gradient
                    const hexToRgb = (hex: string) => {
                        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                        return result
                            ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
                            : null;
                    };

                    const rgb = hexToRgb(color);

                    if (rgb) {
                        gradient.addColorStop(0, `rgba(${rgb}, ${isHighContrast ? 0.6 : 0.3})`); // Stronger fill in HC
                        gradient.addColorStop(1, `rgba(${rgb}, 0)`);
                    } else {
                        gradient.addColorStop(
                            0,
                            isPositive ? 'rgba(0, 217, 165, 0.3)' : 'rgba(255, 107, 107, 0.3)'
                        );
                        gradient.addColorStop(
                            1,
                            isPositive ? 'rgba(0, 217, 165, 0)' : 'rgba(255, 107, 107, 0)'
                        );
                    }

                    return gradient;
                },
                borderWidth: isHighContrast ? 2.5 : 1.5,
                tension: 0.1,
                pointRadius: 0,
                fill: true,
            },
        ],
    };

    const sparklineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
            x: { display: false },
            y: { display: false },
        },
        elements: {
            line: { borderCapStyle: 'round' as const },
        },
    };

    const handleAddSnapshot = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddSnapshot(asset);
    };

    return (
        <div className="mover-card clickable" onClick={() => onCardClick(asset)}>
            <div className="mover-header">
                <div
                    className="mover-icon"
                    style={{
                        background: isPositive
                            ? 'var(--accent-green-glow)'
                            : 'var(--accent-red-glow)',
                    }}
                >
                    {asset.name.charAt(0)}
                </div>
                <div className="mover-info">
                    <div className="mover-name">{asset.name}</div>
                    <div className="mover-meta">
                        <span>{categoryLabel}</span>
                        <PersonBadge name={ownerName} className="mover-owner" />
                    </div>
                </div>
                <button
                    className="snapshot-btn"
                    onClick={!isHidden ? handleAddSnapshot : undefined}
                    title={isHidden ? 'Disabled in Private Mode' : 'Add Snapshot'}
                    disabled={isHidden}
                    style={isHidden ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                    +
                </button>
            </div>

            <div className="mover-body">
                <div className="mover-value-section">
                    <div className="mover-value">
                        <span
                            onClick={
                                !isHidden
                                    ? e => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(
                                              asset.currentValue.toString()
                                          );
                                          setCopied(true);
                                          setTimeout(() => setCopied(false), 2000);
                                      }
                                    : undefined
                            }
                            title={isHidden ? '' : 'Click to copy value'}
                            style={
                                !isHidden
                                    ? {
                                          cursor: 'pointer',
                                          position: 'relative',
                                          display: 'inline-block',
                                      }
                                    : {}
                            }
                        >
                            {formatAmount(asset.currentValue)}
                            {copied && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        left: '50%',
                                        bottom: '100%',
                                        transform: 'translateX(-50%)',
                                        marginBottom: '4px',
                                        fontSize: '11px',
                                        fontWeight: 500,
                                        color: '#ffffff',
                                        backgroundColor: '#10B981',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        pointerEvents: 'none',
                                        whiteSpace: 'nowrap',
                                        zIndex: 10,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    }}
                                >
                                    Copied!
                                </span>
                            )}
                        </span>
                    </div>
                    <div className={`mover-gain ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '+' : ''}
                        {formatAmount(gain)}
                        <span className="mover-percent">
                            {isPositive ? '+' : ''}
                            {gainPercent}%
                        </span>
                    </div>
                </div>
                <div className="mover-sparkline">
                    <Line data={sparklineData} options={sparklineOptions} />
                </div>
            </div>
        </div>
    );
}
