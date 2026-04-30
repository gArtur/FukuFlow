import { createPortal } from 'react-dom';
import type { HeatmapRow, HeatmapCell, ViewMode } from './types';
import { getColorClass, formatMonthAbbr } from './heatmapUtils';
import PersonBadge from '../PersonBadge';

interface HeatmapCardDetailProps {
    row: HeatmapRow;
    viewMode: ViewMode;
    isHidden: boolean;
    currency: string;
    formatAmount: (amount: number) => string;
    onClose: () => void;
    onCellTap: (cell: HeatmapCell) => void;
}

/** Groups cells by calendar year for display, hiding entirely empty years */
function groupByYear(cells: HeatmapCell[]): Map<string, HeatmapCell[]> {
    const map = new Map<string, HeatmapCell[]>();
    cells.forEach(cell => {
        const year = cell.month.substring(0, 4);
        if (!map.has(year)) map.set(year, []);
        map.get(year)!.push(cell);
    });

    // Remove any year that has absolutely no data (e.g. before asset existed)
    for (const [year, yearCells] of map.entries()) {
        if (!yearCells.some(c => c.exists)) {
            map.delete(year);
        }
    }

    return map;
}

interface CellProps {
    cell: HeatmapCell;
    viewMode: ViewMode;
    isHidden: boolean;
    onCellTap: (cell: HeatmapCell) => void;
}

function DetailCell({ cell, viewMode, isHidden, onCellTap }: CellProps) {
    if (!cell.exists) {
        return <div className="heatmap-detail-cell empty" />;
    }
    if (cell.isInception) {
        return <div className="heatmap-detail-cell inception">START</div>;
    }

    const pct = cell.changePercent;
    let label: string;
    if (viewMode === 'percent') {
        label = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    } else if (isHidden) {
        label = '*';
    } else {
        const sign = cell.change >= 0 ? '+' : '';
        label = `${sign}${(cell.change / 1000).toFixed(1)}k`;
    }

    return (
        <div
            className={`heatmap-detail-cell ${getColorClass(pct)}`}
            onClick={() => onCellTap(cell)}
        >
            <span className="detail-cell-month">{formatMonthAbbr(cell.month)}</span>
            <span className="detail-cell-pct">{label}</span>
        </div>
    );
}

/** All-months mini heatmap shown as a bottom drawer when a mobile card is tapped */
export default function HeatmapCardDetail({
    row,
    viewMode,
    isHidden,
    currency,
    formatAmount,
    onClose,
    onCellTap,
}: HeatmapCardDetailProps) {
    const byYear = groupByYear(row.cells);
    const isPositive = row.totalChangePercent >= 0;
    const currencySymbol = currency === 'PLN' ? 'zł' : currency === 'USD' ? '$' : currency;

    return createPortal(
        <>
            <div className="heatmap-drawer-backdrop" onClick={onClose} />
            <div className="heatmap-tooltip-drawer heatmap-card-detail-drawer">
                <div className="heatmap-drawer-handle" />

                {/* Header */}
                <div className="heatmap-detail-header">
                    <div className="heatmap-detail-title">
                        <span className="asset-icon">{row.category.charAt(0).toUpperCase()}</span>
                        <div>
                            <div className="heatmap-detail-name">{row.name}</div>
                            <PersonBadge name={row.ownerName} className="heatmap-detail-owner" />
                        </div>
                    </div>
                    <div className={`heatmap-detail-total ${isPositive ? 'positive' : 'negative'}`}>
                        {viewMode === 'percent'
                            ? `${isPositive ? '+' : ''}${row.totalChangePercent.toFixed(1)}%`
                            : isHidden
                              ? `***** ${currencySymbol}`
                              : formatAmount(row.totalChange)}
                    </div>
                </div>

                {/* Monthly grid — horizontally scrollable, grouped by year */}
                <div className="heatmap-detail-scroll-area">
                    {Array.from(byYear.entries()).map(([year, cells]) => (
                        <div key={year} className="heatmap-detail-year-row">
                            <div className="heatmap-detail-year-label">{year}</div>
                            <div className="heatmap-detail-cells">
                                {cells.map(cell => (
                                    <DetailCell
                                        key={cell.month}
                                        cell={cell}
                                        viewMode={viewMode}
                                        isHidden={isHidden}
                                        onCellTap={onCellTap}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>,
        document.body
    );
}
