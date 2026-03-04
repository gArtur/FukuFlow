import { useMemo, useState } from 'react';
import type { Asset } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useIsTouchDevice, useIsMobile } from '../hooks/useMediaQuery';
import { calculateHeatmapData } from '../utils/heatmapLogic';
import type { HeatmapCell, HeatmapYearRow } from '../utils/heatmapLogic';
import { getColorClass } from './heatmap/heatmapUtils';
import HeatmapTooltip from './heatmap/HeatmapTooltip';
import type { TooltipData } from './heatmap/types';

interface AssetHeatmapProps {
    asset: Asset;
}

/** Month header abbreviations — single letter on touch, three-letter on desktop */
const MONTH_LABELS_FULL = [
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
];
const MONTH_LABELS_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function buildCellTooltip(asset: Asset, cell: HeatmapCell, rect: DOMRect): TooltipData {
    return {
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        assetName: asset.name,
        month: cell.month,
        value: cell.value,
        previousValue: cell.previousValue,
        change: cell.changeValue,
        changePercent: cell.changePercent,
        category: '',
        owner: '',
    };
}

function buildYearTooltip(asset: Asset, row: HeatmapYearRow, rect: DOMRect): TooltipData {
    return {
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        assetName: asset.name,
        month: String(row.year),
        value: row.endValue,
        previousValue: row.startValue,
        change: row.totalChange,
        changePercent: row.totalReturn,
        category: '',
        owner: '',
    };
}

export default function AssetHeatmap({ asset }: AssetHeatmapProps) {
    const { formatAmount, currency } = useSettings();
    const { isHidden } = usePrivacy();
    const isTouchDevice = useIsTouchDevice();
    const isMobile = useIsMobile();
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);

    const heatmapData = useMemo(() => calculateHeatmapData(asset), [asset]);

    const monthLabels = isMobile || isTouchDevice ? MONTH_LABELS_SHORT : MONTH_LABELS_FULL;

    const handleCellEnter = (e: React.MouseEvent, cell: HeatmapCell) => {
        if (isTouchDevice) return;
        setTooltip(buildCellTooltip(asset, cell, e.currentTarget.getBoundingClientRect()));
    };

    const handleCellTap = (cell: HeatmapCell, rect: DOMRect) => {
        setTooltip(prev => {
            if (prev?.month === cell.month) return null;
            return buildCellTooltip(asset, cell, rect);
        });
    };

    const handleTotalEnter = (e: React.MouseEvent, row: HeatmapYearRow) => {
        if (isTouchDevice) return;
        setTooltip(buildYearTooltip(asset, row, e.currentTarget.getBoundingClientRect()));
    };

    const handleTotalTap = (row: HeatmapYearRow, rect: DOMRect) => {
        setTooltip(prev => {
            if (prev?.month === String(row.year)) return null;
            return buildYearTooltip(asset, row, rect);
        });
    };

    const handleLeave = () => setTooltip(null);

    return (
        <div className="chart-card">
            <div className="chart-header">
                <div className="chart-header-left">
                    <h3 className="chart-title">Monthly Returns</h3>
                </div>
            </div>
            <div className="asset-heatmap-table-wrapper">
                <div className="asset-heatmap-grid">
                    {/* Header Row */}
                    <div className="asset-heatmap-row heatmap-header-row">
                        <div className="asset-heatmap-year-label">Year</div>
                        {monthLabels.map((m, i) => (
                            <div key={i} className="asset-heatmap-month-label">
                                {m}
                            </div>
                        ))}
                        <div className="asset-heatmap-total-label">Total</div>
                    </div>

                    {/* Data Rows */}
                    {heatmapData.map(row => (
                        <div key={row.year} className="asset-heatmap-row">
                            <div className="asset-heatmap-year-label value">{row.year}</div>
                            {row.cells.map((cell, idx) =>
                                cell ? (
                                    <div
                                        key={idx}
                                        className={`asset-heatmap-cell ${getColorClass(cell.changePercent)}`}
                                        onMouseEnter={e => handleCellEnter(e, cell)}
                                        onMouseLeave={handleLeave}
                                        onClick={
                                            isTouchDevice
                                                ? e =>
                                                      handleCellTap(
                                                          cell,
                                                          e.currentTarget.getBoundingClientRect()
                                                      )
                                                : undefined
                                        }
                                    >
                                        <span className="cell-text">
                                            {cell.changePercent > 0 ? '+' : ''}
                                            {cell.changePercent.toFixed(1)}%
                                        </span>
                                    </div>
                                ) : (
                                    <div key={idx} className="asset-heatmap-cell empty" />
                                )
                            )}
                            <div
                                className={`asset-heatmap-total-cell ${row.totalReturn >= 0 ? 'positive' : 'negative'}`}
                                onMouseEnter={e => handleTotalEnter(e, row)}
                                onMouseLeave={handleLeave}
                                onClick={
                                    isTouchDevice
                                        ? e =>
                                              handleTotalTap(
                                                  row,
                                                  e.currentTarget.getBoundingClientRect()
                                              )
                                        : undefined
                                }
                            >
                                <span className="cell-text">
                                    {row.totalReturn > 0 ? '+' : ''}
                                    {row.totalReturn.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Color Legend */}
            <div className="heatmap-legend">
                <span className="legend-label">Loss</span>
                <div className="legend-gradient">
                    <div className="legend-cell loss-high" />
                    <div className="legend-cell loss-medium" />
                    <div className="legend-cell loss-low" />
                    <div className="legend-cell neutral" />
                    <div className="legend-cell gain-low" />
                    <div className="legend-cell gain-medium" />
                    <div className="legend-cell gain-high" />
                </div>
                <span className="legend-label">Gain</span>
            </div>

            {tooltip && (
                <HeatmapTooltip
                    tooltip={tooltip}
                    isHidden={isHidden}
                    currency={currency}
                    formatAmount={formatAmount}
                    drawerMode={isMobile || isTouchDevice}
                    onClose={() => setTooltip(null)}
                />
            )}
        </div>
    );
}
