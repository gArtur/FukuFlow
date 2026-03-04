import type { HeatmapRow, HeatmapCell, ViewMode } from './types';
import { getColorClass } from './heatmapUtils';

interface HeatmapMobileCardProps {
    row: HeatmapRow;
    viewMode: ViewMode;
    isHidden: boolean;
    currency: string;
    formatAmount: (amount: number) => string;
    /** Maximum number of recent months to show in the mini strip */
    stripMonths?: number;
    /** Called when a strip cell is tapped (single month detail tooltip) */
    onCellTap: (cell: HeatmapCell) => void;
    /** Called when the card body is tapped (open full-row detail drawer) */
    onCardTap: () => void;
    isPortfolioTotal?: boolean;
}

/** Mini colour-strip showing recent monthly performance */
function MiniMonthStrip({
    cells,
    maxMonths,
    onCellTap,
}: {
    cells: HeatmapCell[];
    maxMonths: number;
    onCellTap: (cell: HeatmapCell) => void;
}) {
    const recentCells = cells.slice(-maxMonths);
    return (
        <div className="heatmap-mobile-strip">
            {recentCells.map(cell => (
                <div
                    key={cell.month}
                    className={`heatmap-mobile-strip-cell ${
                        cell.exists && !cell.isInception
                            ? getColorClass(cell.changePercent)
                            : cell.isInception
                              ? 'inception'
                              : 'not-exists'
                    }`}
                    title={cell.exists ? `${cell.month}: ${cell.changePercent.toFixed(1)}%` : ''}
                    onClick={e => {
                        e.stopPropagation(); // Don't also fire onCardTap
                        if (cell.exists && !cell.isInception) onCellTap(cell);
                    }}
                />
            ))}
        </div>
    );
}

/** Total return badge */
function TotalBadge({
    totalChangePercent,
    totalChange,
    viewMode,
    isHidden,
    currency,
    formatAmount,
}: Pick<HeatmapMobileCardProps, 'viewMode' | 'isHidden' | 'currency' | 'formatAmount'> & {
    totalChangePercent: number;
    totalChange: number;
}) {
    const isPositive = totalChangePercent >= 0;
    const currencySymbol = currency === 'PLN' ? 'zł' : currency === 'USD' ? '$' : currency;

    return (
        <div className={`heatmap-mobile-total ${isPositive ? 'positive' : 'negative'}`}>
            {viewMode === 'percent' ? (
                <>
                    {isPositive ? '+' : ''}
                    {totalChangePercent.toFixed(1)}%
                </>
            ) : isHidden ? (
                `***** ${currencySymbol}`
            ) : (
                formatAmount(totalChange)
            )}
        </div>
    );
}

export default function HeatmapMobileCard({
    row,
    viewMode,
    isHidden,
    currency,
    formatAmount,
    stripMonths = 12,
    onCellTap,
    onCardTap,
    isPortfolioTotal = false,
}: HeatmapMobileCardProps) {
    return (
        <div
            className={`heatmap-mobile-card ${isPortfolioTotal ? 'portfolio-total' : ''}`}
            onClick={onCardTap}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onCardTap()}
            aria-label={`View monthly detail for ${row.name}`}
        >
            <div className="heatmap-mobile-card-info">
                <span className={`asset-icon ${isPortfolioTotal ? 'portfolio-icon' : ''}`}>
                    {isPortfolioTotal ? '★' : row.category.charAt(0).toUpperCase()}
                </span>
                <div className="asset-name-details">
                    <span className="asset-name-text">{row.name}</span>
                    {!isPortfolioTotal && (
                        <span className="asset-owner-badge">{row.ownerName}</span>
                    )}
                </div>
            </div>
            <MiniMonthStrip cells={row.cells} maxMonths={stripMonths} onCellTap={onCellTap} />
            <TotalBadge
                totalChangePercent={row.totalChangePercent}
                totalChange={row.totalChange}
                viewMode={viewMode}
                isHidden={isHidden}
                currency={currency}
                formatAmount={formatAmount}
            />
        </div>
    );
}
