import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Asset } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { usePrivacy } from '../contexts/PrivacyContext';
import { formatFullMonthYear } from '../utils/dateUtils';
import { calculateHeatmapData } from '../utils/heatmapLogic';
import type { HeatmapCell, HeatmapYearRow } from '../utils/heatmapLogic';

interface AssetHeatmapProps {
    asset: Asset;
}

interface TooltipData {
    x: number;
    y: number;
    month: string; // Can be month "2024-01" or year "2024"
    value: number;
    previousValue: number;
    change: number;
    changePercent: number;
    isYearTotal?: boolean;
}

const getColorClass = (changePercent: number): string => {
    if (changePercent >= 5) return 'gain-high';
    if (changePercent >= 2) return 'gain-medium';
    if (changePercent >= 0.5) return 'gain-low';
    if (changePercent >= -0.5) return 'neutral';
    if (changePercent >= -2) return 'loss-low';
    if (changePercent >= -5) return 'loss-medium';
    return 'loss-high';
};

export default function AssetHeatmap({ asset }: AssetHeatmapProps) {
    const { formatAmount, currency } = useSettings();
    const { isHidden } = usePrivacy();
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);

    const heatmapData = useMemo(() => {
        return calculateHeatmapData(asset);
    }, [asset]);

    const handleCellEnter = (e: React.MouseEvent, cell: HeatmapCell) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            month: cell.month,
            value: cell.value,
            previousValue: cell.previousValue,
            change: cell.changeValue,
            changePercent: cell.changePercent,
        });
    };

    const handleTotalEnter = (e: React.MouseEvent, row: HeatmapYearRow) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            month: String(row.year),
            value: row.endValue,
            previousValue: row.startValue,
            change: row.totalChange,
            changePercent: row.totalReturn,
            isYearTotal: true,
        });
    };

    const handleCellLeave = () => {
        setTooltip(null);
    };

    return (
        <div className="chart-card">
            <div className="chart-header">
                <div className="chart-header-left">
                    <h3 className="chart-title">Monthly Returns</h3>
                </div>
            </div>
            <div className="asset-heatmap-table-wrapper">
                <table className="asset-heatmap-table">
                    <thead>
                        <tr>
                            <th className="heatmap-th year-header">Year</th>
                            {[
                                'Jan',
                                'Feb',
                                'Mar',
                                'Apr',
                                'May',
                                'Jun',
                                'Jul',
                                'Aug',
                                'Sep',
                                'Oct',
                                'Nov',
                                'Dec',
                            ].map(m => (
                                <th key={m} className="heatmap-th">
                                    {m}
                                </th>
                            ))}
                            <th className="heatmap-th total-header">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {heatmapData.map(row => (
                            <tr key={row.year}>
                                <td className="heatmap-year-cell">{row.year}</td>
                                {row.cells.map((cell, idx) =>
                                    cell ? (
                                        <td
                                            key={idx}
                                            className={`heatmap-cell ${getColorClass(cell.changePercent)}`}
                                            onMouseEnter={e => handleCellEnter(e, cell)}
                                            onMouseLeave={handleCellLeave}
                                        >
                                            {cell.changePercent > 0 ? '+' : ''}
                                            {cell.changePercent.toFixed(1)}%
                                        </td>
                                    ) : (
                                        <td key={idx} className="heatmap-cell empty"></td>
                                    )
                                )}
                                <td
                                    className={`heatmap-total-cell ${row.totalReturn >= 0 ? 'positive' : 'negative'}`}
                                    onMouseEnter={e => handleTotalEnter(e, row)}
                                    onMouseLeave={handleCellLeave}
                                >
                                    {row.totalReturn > 0 ? '+' : ''}
                                    {row.totalReturn.toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Color Legend */}
            <div className="heatmap-legend">
                <span className="legend-label">Loss</span>
                <div className="legend-gradient">
                    <div className="legend-cell loss-high"></div>
                    <div className="legend-cell loss-medium"></div>
                    <div className="legend-cell loss-low"></div>
                    <div className="legend-cell neutral"></div>
                    <div className="legend-cell gain-low"></div>
                    <div className="legend-cell gain-medium"></div>
                    <div className="legend-cell gain-high"></div>
                </div>
                <span className="legend-label">Gain</span>
            </div>

            {/* Tooltip - using createPortal like PortfolioHeatmap */}
            {tooltip &&
                createPortal(
                    <div
                        className="heatmap-tooltip"
                        style={{
                            left: tooltip.x,
                            top: tooltip.y,
                            transform: 'translate(-50%, -100%)',
                        }}
                    >
                        <div className="tooltip-header">
                            <strong>{asset.name}</strong>
                        </div>
                        <div className="tooltip-month">
                            {tooltip.isYearTotal
                                ? `Year ${tooltip.month}`
                                : formatFullMonthYear(tooltip.month)}
                        </div>
                        <div className="tooltip-stats">
                            <div className="tooltip-row">
                                <span>Start Value:</span>
                                <span>
                                    {isHidden
                                        ? `***** ${currency === 'PLN' ? 'zł' : currency === 'USD' ? '$' : currency}`
                                        : formatAmount(tooltip.previousValue)}
                                </span>
                            </div>
                            <div className="tooltip-row">
                                <span>End Value:</span>
                                <span>
                                    {isHidden
                                        ? `***** ${currency === 'PLN' ? 'zł' : currency === 'USD' ? '$' : currency}`
                                        : formatAmount(tooltip.value)}
                                </span>
                            </div>
                            <div className="tooltip-row">
                                <span>Result:</span>
                                <span className={tooltip.change >= 0 ? 'gain-text' : 'loss-text'}>
                                    {isHidden
                                        ? `***** ${currency === 'PLN' ? 'zł' : currency === 'USD' ? '$' : currency}`
                                        : formatAmount(tooltip.change)}
                                </span>
                            </div>
                            <div className="tooltip-row grand-total">
                                <span>Change:</span>
                                <span className={getColorClass(tooltip.changePercent)}>
                                    {tooltip.changePercent > 0 ? '+' : ''}
                                    {tooltip.changePercent.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            <style>{`
                .asset-heatmap-table-wrapper {
                    overflow-x: auto;
                    min-width: 0;
                }
                .asset-heatmap-table {
                    display: table;
                    border-collapse: separate;
                    border-spacing: 1px;
                    width: 100%;
                    min-width: max-content;
                    table-layout: auto;
                }
                .asset-heatmap-table thead {
                    display: table-header-group;
                }
                .asset-heatmap-table tbody {
                    display: table-row-group;
                }
                .asset-heatmap-table tr {
                    display: table-row;
                }
                .asset-heatmap-table th,
                .asset-heatmap-table td {
                    display: table-cell;
                }
                .heatmap-th {
                    color: var(--text-muted);
                    font-weight: 500;
                    font-size: 11px;
                    text-align: center;
                    padding: 4px 8px;
                    height: 20px;
                    white-space: nowrap;
                }
                .heatmap-th.year-header {
                    text-align: left;
                    width: 48px;
                }
                .heatmap-th.total-header {
                    text-align: center;
                    width: 60px;
                }
                .heatmap-year-cell {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 13px;
                    padding: 4px 8px;
                    width: 48px;
                }
                .heatmap-cell {
                    height: 24px;
                    min-width: 52px;
                    text-align: center;
                    vertical-align: middle;
                    border-radius: var(--radius-sm);
                    font-size: 11px;
                    font-weight: 600;
                    cursor: default;
                    transition: transform 0.1s, box-shadow 0.1s;
                    white-space: nowrap;
                    padding: 4px 8px;
                }
                .heatmap-cell:not(.empty):hover {
                    transform: scale(1.08);
                    z-index: 10;
                    position: relative;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }
                .heatmap-cell.empty {
                    background: transparent;
                    pointer-events: none;
                }
                .heatmap-total-cell {
                    text-align: center;
                    vertical-align: middle;
                    font-weight: 700;
                    font-size: 12px;
                    white-space: nowrap;
                    padding: 4px 8px;
                    width: 60px;
                }
                .heatmap-total-cell.positive {
                    color: var(--accent-green);
                }
                .heatmap-total-cell.negative {
                    color: var(--accent-red);
                }
            `}</style>
        </div>
    );
}
