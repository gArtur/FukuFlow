import { useState, useMemo, useCallback, useRef, useLayoutEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useSettings } from '../contexts/SettingsContext';
import { useIsMobile, useIsTouchDevice } from '../hooks/useMediaQuery';
import { formatMonthLabel, generateMonthRange } from '../utils/dateUtils';
import { generateAssetUrl } from '../utils/navigation';
import { buildAssetHeatmapRow, buildPortfolioHeatmapRow } from './heatmap/buildRows';
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
import PersonBadge from './PersonBadge';
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
    const {
        defaultFilter,
        defaultDateRange,
        currency,
        formatAmount,
        isLoading: settingsLoading,
    } = useSettings();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const isTouchDevice = useIsTouchDevice();
    const [viewMode, setViewMode] = useState<ViewMode>('percent');
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    // mobileGridToggled tracks the user's toggle; showMobileGrid derives from it + isMobile
    const [mobileGridToggled, setMobileGridToggled] = useState(false);
    const showMobileGrid = isMobile && mobileGridToggled;
    const [selectedCardRow, setSelectedCardRow] = useState<HeatmapRow | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // Resolved default person from settings - updates reactively when settings load/change
    const settingsPersonId = useMemo(
        () => (!settingsLoading && defaultFilter && defaultFilter !== 'all' ? defaultFilter : null),
        [defaultFilter, settingsLoading]
    );
    // undefined = user hasn't made an explicit selection; fall back to settingsPersonId
    const [personOverride, setPersonOverride] = useState<string | null | undefined>(undefined);
    const selectedPersonId = personOverride !== undefined ? personOverride : settingsPersonId;
    const setSelectedPersonId = (id: string | null) => setPersonOverride(id);

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

    // Resolved default range from the app-wide default date range setting -
    // null means "no quick-filter default", i.e. full history. Updates
    // reactively when settings load/change, mirroring how settingsPersonId
    // resolves the default person filter above. MAX / Custom / undefined all
    // fall through to full history (live min/max).
    const settingsRange = useMemo(() => {
        if (settingsLoading) return null;
        if (defaultDateRange === 'YTD' || defaultDateRange === '1Y' || defaultDateRange === '5Y') {
            return getQuickFilterRange(defaultDateRange, minMonth, maxMonth);
        }
        return null;
    }, [settingsLoading, defaultDateRange, minMonth, maxMonth]);

    // undefined override = follow the settings default; null = user-selected MAX
    // (follow live min/max); string = user/quick-filter selection.
    const [rangeStartOverride, setRangeStartOverride] = useState<string | null | undefined>(
        undefined
    );
    const [rangeEndOverride, setRangeEndOverride] = useState<string | null | undefined>(undefined);
    const rangeStart =
        (rangeStartOverride !== undefined ? rangeStartOverride : (settingsRange?.start ?? null)) ??
        minMonth;
    const rangeEnd =
        (rangeEndOverride !== undefined ? rangeEndOverride : (settingsRange?.end ?? null)) ??
        maxMonth;

    // Keep the grid scrolled to its far right so the latest months stay in view
    // (the user can scroll back for older history). Runs on open - desktop mount,
    // or when the mobile "Show full grid" toggle reveals it - and again whenever
    // the visible time range changes (quick filter or slider), so the latest
    // month of the new range is shown. Sort/view/person changes don't touch the
    // range, so they leave the user's scroll position alone.
    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (grid) grid.scrollLeft = grid.scrollWidth;
    }, [isMobile, showMobileGrid, settingsLoading, rangeStart, rangeEnd]);

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

    const heatmapData = useMemo(() => {
        const rows = filteredAssets.map(asset =>
            buildAssetHeatmapRow(asset, visibleMonths, maxMonth, getPersonName(asset.ownerId))
        );
        if (sortDirection === 'asc')
            return rows.sort((a, b) => a.totalChangePercent - b.totalChangePercent);
        if (sortDirection === 'desc')
            return rows.sort((a, b) => b.totalChangePercent - a.totalChangePercent);
        return rows.sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredAssets, visibleMonths, maxMonth, getPersonName, sortDirection]);

    const portfolioRow = useMemo(
        () => buildPortfolioHeatmapRow(heatmapData, visibleMonths),
        [heatmapData, visibleMonths]
    );

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
        if (filter === 'MAX') {
            // null = follow live min/max automatically
            setRangeStartOverride(null);
            setRangeEndOverride(null);
        } else {
            const { start, end } = getQuickFilterRange(filter, minMonth, maxMonth);
            setRangeStartOverride(start);
            setRangeEndOverride(end);
        }
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

            <div className="chart-card heatmap-card" data-testid="heatmap-grid">
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
                                if (newStart <= rangeEnd) setRangeStartOverride(newStart);
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
                                if (newEnd >= rangeStart) setRangeEndOverride(newEnd);
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
                                            <PersonBadge
                                                name={row.ownerName}
                                                className="asset-owner-badge"
                                            />
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
                            onClick={() => setMobileGridToggled(v => !v)}
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
