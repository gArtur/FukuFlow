import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useSettings } from '../contexts/SettingsContext';
import { useIsMobile, useIsTouchDevice } from '../hooks/useMediaQuery';
import { formatMonthLabel, generateMonthRange } from '../utils/dateUtils';
import { generateAssetUrl } from '../utils/navigation';
import { getAssetTimeline } from '../utils/heatmapLogic';
import {
    getColorClass,
    formatCompactValue,
    isFirstMonthOfYear,
    getQuickFilterRange,
} from './heatmap/heatmapUtils';
import HeatmapTooltip from './heatmap/HeatmapTooltip';
import HeatmapStats from './heatmap/HeatmapStats';
import HeatmapMobileCard from './heatmap/HeatmapMobileCard';
import HeatmapCardDetail from './heatmap/HeatmapCardDetail';
import type {
    HeatmapCell,
    HeatmapRow,
    TooltipData,
    PortfolioHeatmapProps,
    ViewMode,
    SortDirection,
    QuickFilter,
} from './heatmap/types';

export default function PortfolioHeatmap({ assets, persons }: PortfolioHeatmapProps) {
    const { isHidden } = usePrivacy();
    const { defaultFilter, currency, formatAmount, isLoading: settingsLoading } = useSettings();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const isTouchDevice = useIsTouchDevice();
    const [viewMode, setViewMode] = useState<ViewMode>('percent');
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [showMobileGrid, setShowMobileGrid] = useState(false);
    const [selectedCardRow, setSelectedCardRow] = useState<HeatmapRow | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // Reset grid toggle when switching to desktop
    useEffect(() => {
        if (!isMobile) setShowMobileGrid(false);
    }, [isMobile]);

    // Sync with default filter from settings
    useEffect(() => {
        if (!settingsLoading) {
            setSelectedPersonId(defaultFilter && defaultFilter !== 'all' ? defaultFilter : null);
        }
    }, [defaultFilter, settingsLoading]);

    // Filter assets based on selection
    const filteredAssets = useMemo(() => {
        if (!selectedPersonId) return assets;
        return assets.filter(asset => asset.ownerId === selectedPersonId);
    }, [assets, selectedPersonId]);

    // Find the overall date range from all assets
    const { minMonth, maxMonth } = useMemo(() => {
        let min = '9999-12';
        let max = '0000-01';

        assets.forEach(asset => {
            asset.valueHistory.forEach(entry => {
                const month = entry.date.substring(0, 7);
                if (month < min) min = month;
                if (month > max) max = month;
            });
        });

        if (min === '9999-12') {
            const now = new Date();
            min = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            max = min;
        }

        return { minMonth: min, maxMonth: max };
    }, [assets]);

    // Time range state
    const [rangeStart, setRangeStart] = useState(minMonth);
    const [rangeEnd, setRangeEnd] = useState(maxMonth);

    useEffect(() => {
        setRangeStart(minMonth);
        setRangeEnd(maxMonth);
    }, [minMonth, maxMonth]);

    const allMonths = useMemo(() => generateMonthRange(minMonth, maxMonth), [minMonth, maxMonth]);
    const visibleMonths = useMemo(
        () => generateMonthRange(rangeStart, rangeEnd),
        [rangeStart, rangeEnd]
    );

    const getPersonName = useCallback(
        (ownerId: string): string => {
            const person = persons.find(p => p.id === ownerId);
            return person?.name || 'Unknown';
        },
        [persons]
    );

    const processAssetData = useCallback(
        (asset: (typeof assets)[0]): HeatmapRow => {
            const timeline = getAssetTimeline(asset, maxMonth);
            const sortedTimelineKeys = Array.from(timeline.keys()).sort();
            const firstDataMonth = sortedTimelineKeys.length > 0 ? sortedTimelineKeys[0] : null;

            const cells: HeatmapCell[] = visibleMonths.map(month => {
                const isInception = month === firstDataMonth;
                const entry = timeline.get(month);

                // Calculate previous month string
                const y = parseInt(month.substring(0, 4));
                const m = parseInt(month.substring(5, 7)) - 1;
                const date = new Date(y, m, 1);
                date.setMonth(date.getMonth() - 1);
                const prevMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const prevValue = timeline.get(prevMonthStr)?.value ?? 0;

                if (entry) {
                    const flow = entry.flow;
                    const basis = prevValue + flow;
                    const change = entry.value - basis;
                    const changePercent = basis !== 0 ? (change / basis) * 100 : 0;

                    return {
                        month,
                        value: entry.value,
                        previousValue: prevValue,
                        change,
                        changePercent,
                        hasData: entry.realDataExists,
                        exists: true,
                        isInception,
                        monthlyFlow: flow,
                    };
                }

                return {
                    month,
                    value: 0,
                    previousValue: 0,
                    change: 0,
                    changePercent: 0,
                    hasData: false,
                    exists: false,
                    isInception: false,
                    monthlyFlow: 0,
                };
            });

            const totalChange = cells.reduce((sum, c) => sum + c.change, 0);
            const totalFlow = cells.reduce((sum, c) => sum + (c.monthlyFlow ?? 0), 0);
            const startValueBasis =
                cells.length > 0 && !cells[0].isInception ? cells[0].previousValue : 0;
            const basis = startValueBasis + totalFlow;
            const totalChangePercent = basis > 0 ? (totalChange / basis) * 100 : 0;

            return {
                id: asset.id,
                name: asset.name,
                category: asset.category,
                ownerName: getPersonName(asset.ownerId),
                cells,
                totalChange,
                totalChangePercent,
                startValue: cells.length > 0 ? cells[0].previousValue : 0,
                endValue: cells.length > 0 ? cells[cells.length - 1].value : asset.currentValue,
            };
        },
        [visibleMonths, maxMonth, getPersonName]
    );

    const heatmapData = useMemo(() => {
        const rows = filteredAssets.map(asset => processAssetData(asset));
        if (sortDirection === 'asc')
            return rows.sort((a, b) => a.totalChangePercent - b.totalChangePercent);
        if (sortDirection === 'desc')
            return rows.sort((a, b) => b.totalChangePercent - a.totalChangePercent);
        return rows.sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredAssets, processAssetData, sortDirection]);

    const portfolioRow = useMemo((): HeatmapRow => {
        const cells: HeatmapCell[] = visibleMonths.map((month, index) => {
            let totalValue = 0;
            let totalPreviousValue = 0;
            let totalFlow = 0;
            let totalChange = 0;
            let hasAnyData = false;

            heatmapData.forEach(row => {
                const cell = row.cells[index];
                if (cell) {
                    totalValue += cell.value;
                    totalPreviousValue += cell.previousValue;
                    totalFlow += cell.monthlyFlow ?? 0;
                    totalChange += cell.change;
                    if (cell.hasData) hasAnyData = true;
                }
            });

            const basis = totalPreviousValue + totalFlow;
            const changePercent = basis !== 0 ? (totalChange / basis) * 100 : 0;

            return {
                month,
                value: totalValue,
                previousValue: totalPreviousValue,
                change: totalChange,
                changePercent,
                hasData: hasAnyData,
                exists: true,
                isInception: false,
            };
        });

        const totalChange = cells.reduce((sum, c) => sum + c.change, 0);
        let initialPortfolioBasis = 0;
        let totalFlowInRange = 0;

        heatmapData.forEach(row => {
            if (row.cells.length > 0) {
                const firstCell = row.cells[0];
                if (!firstCell.isInception && firstCell.exists) {
                    initialPortfolioBasis += firstCell.previousValue;
                }
                row.cells.forEach(cell => {
                    totalFlowInRange += cell.monthlyFlow ?? 0;
                });
            }
        });

        const basis = initialPortfolioBasis + totalFlowInRange;
        const totalChangePercent = basis > 0 ? (totalChange / basis) * 100 : 0;

        return {
            id: 'portfolio-total',
            name: 'TOTAL PORTFOLIO',
            category: 'Total',
            ownerName: 'Portfolio',
            cells,
            totalChange,
            totalChangePercent,
            startValue: initialPortfolioBasis,
            endValue: cells.length > 0 ? cells[cells.length - 1].value : 0,
        };
    }, [heatmapData, visibleMonths]);

    // ── Tooltip helpers ──────────────────────────────────────────────────────

    const buildTooltip = (
        event: React.MouseEvent,
        row: HeatmapRow,
        cell: HeatmapCell
    ): TooltipData => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            assetName: row.name,
            month: cell.month,
            value: cell.value,
            change: cell.change,
            changePercent: cell.changePercent,
            category: row.category,
            owner: row.ownerName,
            previousValue: cell.previousValue,
        };
    };

    const buildTooltipFromCell = (row: HeatmapRow, cell: HeatmapCell): TooltipData => ({
        x: 0,
        y: 0,
        assetName: row.name,
        month: cell.month,
        value: cell.value,
        change: cell.change,
        changePercent: cell.changePercent,
        category: row.category,
        owner: row.ownerName,
        previousValue: cell.previousValue,
    });

    const handleCellHover = (event: React.MouseEvent, row: HeatmapRow, cell: HeatmapCell) => {
        if (isTouchDevice) return; // Touch handled by tap
        setTooltip(buildTooltip(event, row, cell));
    };

    const handleCellTap = (row: HeatmapRow, cell: HeatmapCell) => {
        setTooltip(prev => {
            // Toggle off if same cell tapped again
            if (prev?.month === cell.month && prev?.assetName === row.name) return null;
            return buildTooltipFromCell(row, cell);
        });
    };

    const handleCellLeave = () => setTooltip(null);

    // ── Cell content renderer ────────────────────────────────────────────────

    const renderCellContent = (cell: HeatmapCell) => {
        if (!cell.exists) return null;
        if (cell.isInception) return <span className="cell-inception-label">START</span>;

        let changeDisplay: string;
        if (viewMode === 'percent') {
            changeDisplay =
                cell.changePercent > 0
                    ? `+${cell.changePercent.toFixed(1)}%`
                    : `${cell.changePercent.toFixed(1)}%`;
        } else {
            if (isHidden) {
                changeDisplay = '*****';
            } else {
                const sign = cell.change >= 0 ? '+' : '';
                changeDisplay = `${sign}${(cell.change / 1000).toFixed(2)}k`;
            }
        }

        return (
            <>
                <span className="cell-change">{changeDisplay}</span>
                <span className="cell-value">{formatCompactValue(cell.value, isHidden)}</span>
            </>
        );
    };

    // ── Quick filter helpers ─────────────────────────────────────────────────

    const applyQuickFilter = (filter: QuickFilter) => {
        const { start, end } = getQuickFilterRange(filter, minMonth, maxMonth);
        setRangeStart(start);
        setRangeEnd(end);
    };

    const activeQuickFilter = useMemo((): QuickFilter | null => {
        const ytd = getQuickFilterRange('YTD', minMonth, maxMonth);
        const oneY = getQuickFilterRange('1Y', minMonth, maxMonth);
        const fiveY = getQuickFilterRange('5Y', minMonth, maxMonth);
        const max = getQuickFilterRange('MAX', minMonth, maxMonth);

        if (rangeStart === max.start && rangeEnd === max.end) return 'MAX';
        if (rangeStart === ytd.start && rangeEnd === ytd.end) return 'YTD';
        if (rangeStart === oneY.start && rangeEnd === oneY.end) return '1Y';
        if (rangeStart === fiveY.start && rangeEnd === fiveY.end) return '5Y';
        return null;
    }, [rangeStart, rangeEnd, minMonth, maxMonth]);

    const toggleSort = () => {
        if (sortDirection === null) setSortDirection('desc');
        else if (sortDirection === 'desc') setSortDirection('asc');
        else setSortDirection(null);
    };

    // Slider indices
    const startIndex = allMonths.indexOf(rangeStart);
    const endIndex = allMonths.indexOf(rangeEnd);

    // ── Shared tooltip props ─────────────────────────────────────────────────

    const tooltipProps = {
        isHidden,
        currency,
        formatAmount,
    };

    // ── Render ───────────────────────────────────────────────────────────────

    const showCardList = isMobile && !showMobileGrid;

    return (
        <>
            {/* Person Filter */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${!selectedPersonId ? 'active' : ''}`}
                    onClick={() => setSelectedPersonId(null)}
                >
                    All
                </button>
                {persons.map(person => (
                    <button
                        key={person.id}
                        className={`filter-tab ${selectedPersonId === person.id ? 'active' : ''}`}
                        onClick={() => setSelectedPersonId(person.id)}
                    >
                        {person.name}
                    </button>
                ))}
            </div>

            <div className="chart-card heatmap-card">
                <div className="chart-header">
                    <div className="chart-header-left">
                        <h3 className="chart-title">Portfolio Heatmap</h3>
                        <div className="heatmap-period-label">
                            {formatMonthLabel(rangeStart)} → {formatMonthLabel(rangeEnd)}
                        </div>
                    </div>
                    <div className="chart-header-right">
                        <div className="time-range-tabs">
                            <button
                                className={`time-tab ${viewMode === 'percent' ? 'active' : ''}`}
                                onClick={() => setViewMode('percent')}
                            >
                                % Change
                            </button>
                            <button
                                className={`time-tab ${viewMode === 'value' ? 'active' : ''}`}
                                onClick={() => setViewMode('value')}
                            >
                                Value
                            </button>
                        </div>
                    </div>
                </div>

                {/* Time Range Slider */}
                <div className="heatmap-slider-section">
                    <div className="slider-header">
                        <label className="slider-label">Time Range</label>
                        <div className="time-range-tabs">
                            {(['YTD', '1Y', '5Y', 'MAX'] as const).map(filter => (
                                <button
                                    key={filter}
                                    className={`time-tab ${activeQuickFilter === filter ? 'active' : ''}`}
                                    onClick={() => applyQuickFilter(filter)}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="range-slider-container">
                        <input
                            type="range"
                            min={0}
                            max={allMonths.length - 1}
                            value={startIndex}
                            onChange={e => {
                                const newStart = allMonths[parseInt(e.target.value)];
                                if (newStart <= rangeEnd) setRangeStart(newStart);
                            }}
                            className="range-slider range-slider-start"
                        />
                        <input
                            type="range"
                            min={0}
                            max={allMonths.length - 1}
                            value={endIndex}
                            onChange={e => {
                                const newEnd = allMonths[parseInt(e.target.value)];
                                if (newEnd >= rangeStart) setRangeEnd(newEnd);
                            }}
                            className="range-slider range-slider-end"
                        />
                        <div
                            className="range-slider-track"
                            style={{
                                left: `${(startIndex / (allMonths.length - 1)) * 100}%`,
                                width: `${((endIndex - startIndex) / (allMonths.length - 1)) * 100}%`,
                            }}
                        />
                    </div>
                </div>

                {/* Heatmap Grid / Mobile Card List */}
                {showCardList ? (
                    <div className="heatmap-mobile-list">
                        <HeatmapMobileCard
                            row={portfolioRow}
                            viewMode={viewMode}
                            isHidden={isHidden}
                            currency={currency}
                            formatAmount={formatAmount}
                            isPortfolioTotal
                            onCellTap={cell => handleCellTap(portfolioRow, cell)}
                            onCardTap={() => setSelectedCardRow(portfolioRow)}
                        />
                        {heatmapData.map(row => (
                            <HeatmapMobileCard
                                key={row.id}
                                row={row}
                                viewMode={viewMode}
                                isHidden={isHidden}
                                currency={currency}
                                formatAmount={formatAmount}
                                onCellTap={cell => handleCellTap(row, cell)}
                                onCardTap={() => setSelectedCardRow(row)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="heatmap-grid-wrapper" ref={gridRef}>
                        <div className="heatmap-main-grid">
                            {/* Month Headers */}
                            <div className="heatmap-month-header">
                                <div className="heatmap-asset-name-header">Asset</div>
                                {visibleMonths.map((month, index) => (
                                    <Fragment key={month}>
                                        {isFirstMonthOfYear(month, index) && (
                                            <div className="year-separator" />
                                        )}
                                        <div className="heatmap-month">
                                            {isFirstMonthOfYear(month, index) && (
                                                <span className="year-label">
                                                    {month.substring(0, 4)}
                                                </span>
                                            )}
                                            {formatMonthLabel(month)}
                                        </div>
                                    </Fragment>
                                ))}
                                <div
                                    className="heatmap-total-header sortable"
                                    onClick={toggleSort}
                                    title="Click to sort by performance"
                                >
                                    Total
                                    {sortDirection && (
                                        <span className="sort-indicator">
                                            {sortDirection === 'desc' ? ' ↓' : ' ↑'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Portfolio Total Row */}
                            <div className="heatmap-row portfolio-total">
                                <div className="heatmap-asset-name">
                                    <span className="asset-icon portfolio-icon">★</span>
                                    <span className="asset-name-text">{portfolioRow.name}</span>
                                </div>
                                {portfolioRow.cells.map((cell, index) => (
                                    <Fragment key={cell.month}>
                                        {isFirstMonthOfYear(cell.month, index) && (
                                            <div className="year-separator" />
                                        )}
                                        <div
                                            className={`heatmap-cell ${getColorClass(cell.changePercent)}`}
                                            onMouseEnter={e =>
                                                handleCellHover(e, portfolioRow, cell)
                                            }
                                            onMouseLeave={handleCellLeave}
                                            onClick={
                                                isTouchDevice
                                                    ? () => handleCellTap(portfolioRow, cell)
                                                    : undefined
                                            }
                                        >
                                            {renderCellContent(cell)}
                                        </div>
                                    </Fragment>
                                ))}
                                <div
                                    className={`heatmap-cell-total ${portfolioRow.totalChangePercent >= 0 ? 'positive' : 'negative'}`}
                                >
                                    {viewMode === 'percent'
                                        ? `${portfolioRow.totalChangePercent >= 0 ? '+' : ''}${portfolioRow.totalChangePercent.toFixed(1)}%`
                                        : isHidden
                                          ? `***** ${currency === 'PLN' ? 'zł' : currency === 'USD' ? '$' : currency}`
                                          : formatAmount(portfolioRow.totalChange)}
                                </div>
                            </div>

                            {/* Asset Rows */}
                            {heatmapData.map(row => (
                                <div key={row.id} className="heatmap-row">
                                    <div
                                        className="heatmap-asset-name clickable"
                                        onClick={() =>
                                            navigate(generateAssetUrl(row.ownerName, row.name))
                                        }
                                        title={`View ${row.name} details`}
                                    >
                                        <span className="asset-icon">
                                            {row.category.charAt(0).toUpperCase()}
                                        </span>
                                        <div className="asset-name-details">
                                            <span className="asset-name-text">{row.name}</span>
                                            <span className="asset-owner-badge">
                                                {row.ownerName}
                                            </span>
                                        </div>
                                    </div>
                                    {row.cells.map((cell, index) => (
                                        <Fragment key={cell.month}>
                                            {isFirstMonthOfYear(cell.month, index) && (
                                                <div className="year-separator" />
                                            )}
                                            <div
                                                className={`heatmap-cell ${cell.exists ? (cell.isInception ? 'inception' : getColorClass(cell.changePercent)) : 'not-exists'} ${cell.exists && !cell.hasData ? 'no-data' : ''}`}
                                                onMouseEnter={
                                                    cell.exists && !isTouchDevice
                                                        ? e => handleCellHover(e, row, cell)
                                                        : undefined
                                                }
                                                onMouseLeave={
                                                    cell.exists && !isTouchDevice
                                                        ? handleCellLeave
                                                        : undefined
                                                }
                                                onClick={
                                                    cell.exists && isTouchDevice
                                                        ? () => handleCellTap(row, cell)
                                                        : undefined
                                                }
                                            >
                                                {renderCellContent(cell)}
                                            </div>
                                        </Fragment>
                                    ))}
                                    <div
                                        className={`heatmap-cell-total ${row.totalChangePercent >= 0 ? 'positive' : 'negative'}`}
                                    >
                                        {viewMode === 'percent'
                                            ? `${row.totalChangePercent >= 0 ? '+' : ''}${row.totalChangePercent.toFixed(1)}%`
                                            : isHidden
                                              ? `***** ${currency === 'PLN' ? 'zł' : currency === 'USD' ? '$' : currency}`
                                              : formatAmount(row.totalChange)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mobile grid toggle */}
                {isMobile && (
                    <div className="heatmap-mobile-toggle">
                        <button
                            className="btn-secondary heatmap-mobile-toggle-btn"
                            onClick={() => setShowMobileGrid(v => !v)}
                        >
                            {showMobileGrid ? '← Card view' : 'Show full grid →'}
                        </button>
                    </div>
                )}

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
            </div>

            {/* Summary Stats */}
            <HeatmapStats portfolioRow={portfolioRow} />

            {/* Card-tap full row detail drawer */}
            {selectedCardRow && (
                <HeatmapCardDetail
                    row={selectedCardRow}
                    viewMode={viewMode}
                    isHidden={isHidden}
                    currency={currency}
                    formatAmount={formatAmount}
                    onClose={() => setSelectedCardRow(null)}
                    onCellTap={cell => {
                        setSelectedCardRow(null);
                        handleCellTap(selectedCardRow, cell);
                    }}
                />
            )}

            {/* Tooltip (floating on desktop, drawer on touch/mobile) */}
            {tooltip && (
                <HeatmapTooltip
                    tooltip={tooltip}
                    drawerMode={isMobile || isTouchDevice}
                    onClose={() => setTooltip(null)}
                    {...tooltipProps}
                />
            )}
        </>
    );
}
