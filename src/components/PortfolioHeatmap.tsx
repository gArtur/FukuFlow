import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { usePrivacy } from '../contexts/PrivacyContext';
import type { Asset, Person } from '../types';
// remove formatCurrency import as we'll use formatAmount from settings
import {
    formatMonthLabel,
    formatFullMonthYear,
    generateMonthRange,
} from '../utils/dateUtils';
import { generateAssetUrl } from '../utils/navigation';
import { getAssetTimeline } from '../utils/heatmapLogic';

interface PortfolioHeatmapProps {
    assets: Asset[];
    persons: Person[];
}

interface HeatmapCell {
    month: string; // "2024-01", "2024-02", etc.
    value: number; // Current value
    previousValue: number; // Previous month value
    change: number; // Change in PLN
    changePercent: number; // Change percentage
    hasData: boolean; // Whether this month had actual data
    exists: boolean; // Whether the asset existed in this month
    isInception: boolean; // Whether this is the first month of data
}

interface HeatmapRow {
    id: string;
    name: string;
    category: string;
    ownerName: string;
    cells: HeatmapCell[];
    totalChange: number;
    totalChangePercent: number;
    startValue: number;
    endValue: number;
}

interface TooltipData {
    x: number;
    y: number;
    assetName: string;
    month: string;
    value: number;
    previousValue: number;
    change: number;
    changePercent: number;
    category: string;
    owner: string;
}

type ViewMode = 'percent' | 'value';

// formatCurrency, formatMonthLabel, formatFullMonthYear imported from utils

// Get color class based on percentage change
const getColorClass = (changePercent: number): string => {
    if (changePercent >= 5) return 'gain-high';
    if (changePercent >= 2) return 'gain-medium';
    if (changePercent >= 0.5) return 'gain-low';
    if (changePercent >= -0.5) return 'neutral';
    if (changePercent >= -2) return 'loss-low';
    if (changePercent >= -5) return 'loss-medium';
    return 'loss-high';
};

// getPreviousMonth, getNextMonth, generateMonthRange imported from utils/dateUtils

import { useSettings } from '../contexts/SettingsContext';

export default function PortfolioHeatmap({ assets, persons }: PortfolioHeatmapProps) {
    const { isHidden } = usePrivacy();
    const { defaultFilter, currency, formatAmount, isLoading: settingsLoading } = useSettings();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<ViewMode>('percent');
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

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

        // Use filtered assets to determine range if only viewing one person?
        // Or should we keep the global range? Usually better to keep global range for stability.
        // Let's use ALL assets for range stability so the grid doesn't jump around.
        assets.forEach(asset => {
            asset.valueHistory.forEach(entry => {
                const month = entry.date.substring(0, 7);
                if (month < min) min = month;
                if (month > max) max = month;
            });
        });

        // If no data, use current month
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

    // Update range when data changes
    useEffect(() => {
        setRangeStart(minMonth);
        setRangeEnd(maxMonth);
    }, [minMonth, maxMonth]);

    // Generate all months for the slider
    const allMonths = useMemo(() => generateMonthRange(minMonth, maxMonth), [minMonth, maxMonth]);

    // Generate months in current view range
    const visibleMonths = useMemo(
        () => generateMonthRange(rangeStart, rangeEnd),
        [rangeStart, rangeEnd]
    );

    // Get person name by ID
    const getPersonName = useCallback(
        (ownerId: string): string => {
            const person = persons.find(p => p.id === ownerId);
            return person?.name || 'Unknown';
        },
        [persons]
    );

    // Helper function to process a single asset's data into heatmap rows
    const processAssetData = useCallback(
        (asset: Asset): HeatmapRow => {
            // Use shared logic for timeline generation with forward fill
            // Range is minimal necessary to cover minMonth -> rangeEnd (or maxMonth)
            // But we can just ask for history til maxMonth to be safe and consistent
            // Actually, we need to respect the view's rangeStart for 'visible' logic,
            // but the timeline itself should be generated from data start.

            const timeline = getAssetTimeline(asset, maxMonth);

            const cells: HeatmapCell[] = [];
            const sortedTimelineKeys = Array.from(timeline.keys()).sort();
            const firstDataMonth = sortedTimelineKeys.length > 0 ? sortedTimelineKeys[0] : null;

            // We need 'previousValue' for the first month in 'visibleMonths'.
            // getAssetTimeline returns values for months. 
            // We can look up (visibleMonth - 1) in the timeline.

            visibleMonths.forEach(month => {
                const isInception = month === firstDataMonth;
                // Wait, getAssetTimeline returns map with keys for full range.
                // But does it include keys BEFORE the asset started? No, it starts at historyStart.
                // So .has(month) effectively means "Asset has started".

                const entry = timeline.get(month);

                // Needed: previousValue.
                let prevValue = 0;
                // Calculate previous month string
                // We're iterating strings like "2023-05".
                // We can't easily do string math.
                // But we can optimize: just track it in the loop?
                // The loop iterates visibleMonths. The previous month might be outside.

                // Lookup previous month in timeline
                const y = parseInt(month.substring(0, 4));
                const m = parseInt(month.substring(5, 7)) - 1;
                const date = new Date(y, m, 1);
                date.setMonth(date.getMonth() - 1);
                const prevMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (timeline.has(prevMonthStr)) {
                    prevValue = timeline.get(prevMonthStr)!.value;
                }

                // If entry exists (meaning asset has started)
                if (entry) {
                    const value = entry.value;
                    // For inception month, strictly speaking previous value is 0 (or undefined).
                    // In heatmap logic, we usually treat inception: 
                    // basis = flow. change = value - flow.

                    const flow = entry.flow;
                    // If isInception, prevValue should definitely be 0 from lookup (key won't exist).

                    const basis = prevValue + flow;
                    const change = value - basis;
                    const changePercent = basis !== 0 ? (change / basis) * 100 : 0;

                    cells.push({
                        month,
                        value,
                        previousValue: prevValue,
                        change,
                        changePercent,
                        hasData: entry.realDataExists,
                        exists: true,
                        isInception,
                    });

                    // Attach extra data for portfolio aggregation using type assertion or weak map?
                    // The original code did: (cells[..] as any).monthlyFlow
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (cells[cells.length - 1] as any).monthlyFlow = flow;
                } else {
                    // Asset hasn't started yet
                    cells.push({
                        month,
                        value: 0,
                        previousValue: 0,
                        change: 0,
                        changePercent: 0,
                        hasData: false,
                        exists: false,
                        isInception: false,
                    });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (cells[cells.length - 1] as any).monthlyFlow = 0;
                }
            });

            // Calculate totals for the visible range
            const totalChange = cells.reduce((sum, c) => sum + c.change, 0);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const totalFlow = cells.reduce((sum, c) => sum + ((c as any).monthlyFlow || 0), 0);

            // ROI Basis: If asset started in the first visible month, startValue is 0.
            // If asset existed before, startValue is its carry-over value.
            const startValueBasis =
                cells.length > 0 && !cells[0].isInception ? cells[0].previousValue : 0;
            const basis = startValueBasis + totalFlow;
            const totalChangePercent = basis > 0 ? (totalChange / basis) * 100 : 0;
            const startValue = cells.length > 0 ? cells[0].previousValue : 0;

            const endValue = cells.length > 0 ? cells[cells.length - 1].value : asset.currentValue;

            return {
                id: asset.id,
                name: asset.name,
                category: asset.category,
                ownerName: getPersonName(asset.ownerId),
                cells,
                totalChange,
                totalChangePercent,
                startValue,
                endValue,
            };
        },
        [visibleMonths, maxMonth, getPersonName]
    );

    // Generate Heatmap Data
    const heatmapData = useMemo(() => {
        // Use filteredAssets for the heatmap rows
        const rows = filteredAssets.map(asset => processAssetData(asset));

        // Sort based on current sort direction
        if (sortDirection === 'asc') {
            return rows.sort((a, b) => a.totalChangePercent - b.totalChangePercent);
        } else if (sortDirection === 'desc') {
            return rows.sort((a, b) => b.totalChangePercent - a.totalChangePercent);
        }
        // Default: alphabetical sort
        return rows.sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredAssets, processAssetData, sortDirection]);

    // Calculate portfolio totals row
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    totalFlow += (cell as any).monthlyFlow || 0;
                    totalChange += cell.change;
                    if (cell.hasData) hasAnyData = true;
                }
            });

            const basis = totalPreviousValue + totalFlow;
            // For the row itself, we use the correctly aggregated change sum
            const change = totalChange;
            const changePercent = basis !== 0 ? (change / basis) * 100 : 0;

            return {
                month,
                value: totalValue,
                previousValue: totalPreviousValue,
                change,
                changePercent,
                hasData: hasAnyData,
                exists: true,
                isInception: false, // Portfolio as a whole doesn't have an inception month
            };
        });

        const totalChange = cells.reduce((sum, c) => sum + c.change, 0);

        // Final Summary Basis:
        // Identify the "initial portfolio value" at the start of the visible range.
        // This is the sum of (value at start of range) for all assets that existed then.
        let initialPortfolioBasis = 0;

        // This is the sum of all inflows (investments) occurring DURING the visible range.
        let totalFlowInRange = 0;

        heatmapData.forEach(row => {
            if (row.cells.length > 0) {
                const firstCell = row.cells[0];
                // If asset existed at start of this view, its previousValue is part of the initial portfolio basis
                // "isInception" means the asset was created IN this month, so it wasn't there before.
                // So if !isInception, we add previousValue.
                if (!firstCell.isInception && firstCell.exists) {
                    initialPortfolioBasis += firstCell.previousValue;
                }

                // Add up flows for all cells in range
                row.cells.forEach(cell => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    totalFlowInRange += (cell as any).monthlyFlow || 0;
                });
            }
        });

        const basis = initialPortfolioBasis + totalFlowInRange;
        const totalChangePercent = basis > 0 ? (totalChange / basis) * 100 : 0;
        const startValue = initialPortfolioBasis;
        const endValue = cells.length > 0 ? cells[cells.length - 1].value : 0;

        return {
            id: 'portfolio-total',
            name: 'TOTAL PORTFOLIO',
            category: 'Total',
            ownerName: 'Portfolio',
            cells,
            totalChange,
            totalChangePercent,
            startValue,
            endValue,
        };
    }, [heatmapData, visibleMonths]);

    // Handle cell hover
    const handleCellHover = (event: React.MouseEvent, row: HeatmapRow, cell: HeatmapCell) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltip({
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
        });
    };

    const handleCellLeave = () => {
        setTooltip(null);
    };

    // Format the compact value display for cells (e.g., "15.2k" or "1.5M")
    const formatCompactValue = (value: number): string => {
        if (isHidden) return '***';
        if (Math.abs(value) >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        }
        if (Math.abs(value) >= 1000) {
            return `${(value / 1000).toFixed(1)}k`;
        }
        return value.toFixed(0);
    };

    // Render cell content with change on top and value below
    const renderCellContent = (cell: HeatmapCell) => {
        if (!cell.exists) return null; // Empty for non-existing periods
        if (cell.isInception) return <span className="cell-inception-label">START</span>;

        // Format the change display
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
                <span className="cell-value">{formatCompactValue(cell.value)}</span>
            </>
        );
    };

    // Slider index helpers
    const startIndex = allMonths.indexOf(rangeStart);
    const endIndex = allMonths.indexOf(rangeEnd);

    // Quick filter helpers
    const getQuickFilterRange = (
        filter: 'YTD' | '1Y' | '5Y' | 'MAX'
    ): { start: string; end: string } => {
        const now = new Date();
        const currentYear = now.getFullYear();

        switch (filter) {
            case 'YTD':
                return {
                    start: `${currentYear}-01`,
                    end: maxMonth,
                };
            case '1Y': {
                const oneYearAgo = new Date(now);
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                const startMonth = `${oneYearAgo.getFullYear()}-${String(oneYearAgo.getMonth() + 1).padStart(2, '0')}`;
                return {
                    start: startMonth < minMonth ? minMonth : startMonth,
                    end: maxMonth,
                };
            }
            case '5Y': {
                const fiveYearsAgo = new Date(now);
                fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
                const startMonth = `${fiveYearsAgo.getFullYear()}-${String(fiveYearsAgo.getMonth() + 1).padStart(2, '0')}`;
                return {
                    start: startMonth < minMonth ? minMonth : startMonth,
                    end: maxMonth,
                };
            }
            case 'MAX':
            default:
                return { start: minMonth, end: maxMonth };
        }
    };

    const applyQuickFilter = (filter: 'YTD' | '1Y' | '5Y' | 'MAX') => {
        const { start, end } = getQuickFilterRange(filter);
        setRangeStart(start);
        setRangeEnd(end);
    };

    // Check which quick filter is currently active
    const activeQuickFilter = useMemo((): 'YTD' | '1Y' | '5Y' | 'MAX' | null => {
        const ytd = getQuickFilterRange('YTD');
        const oneY = getQuickFilterRange('1Y');
        const fiveY = getQuickFilterRange('5Y');
        const max = getQuickFilterRange('MAX');

        if (rangeStart === max.start && rangeEnd === max.end) return 'MAX';
        if (rangeStart === ytd.start && rangeEnd === ytd.end) return 'YTD';
        if (rangeStart === oneY.start && rangeEnd === oneY.end) return '1Y';
        if (rangeStart === fiveY.start && rangeEnd === fiveY.end) return '5Y';
        return null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rangeStart, rangeEnd, minMonth, maxMonth]);

    // Toggle sort direction
    const toggleSort = () => {
        if (sortDirection === null) {
            setSortDirection('desc'); // First click: best performers first
        } else if (sortDirection === 'desc') {
            setSortDirection('asc'); // Second click: worst performers first
        } else {
            setSortDirection(null); // Third click: back to alphabetical
        }
    };

    // Helper to check if a month is the first month of its year
    const isFirstMonthOfYear = (month: string, index: number): boolean => {
        if (index === 0) return false; // Don't show separator before first column
        return month.endsWith('-01');
    };

    return (
        <>
            {/* Person Filter - Dashboard Style */}
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

            {/* Heatmap Card - Dashboard Chart Style */}
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

                {/* Heatmap Grid */}
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
                                        onMouseEnter={e => handleCellHover(e, portfolioRow, cell)}
                                        onMouseLeave={handleCellLeave}
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
                                    onClick={() => navigate(generateAssetUrl(row.ownerName, row.name))}
                                    title={`View ${row.name} details`}
                                >
                                    <span className="asset-icon">
                                        {row.category.charAt(0).toUpperCase()}
                                    </span>
                                    <div className="asset-name-details">
                                        <span className="asset-name-text">{row.name}</span>
                                        <span className="asset-owner-badge">{row.ownerName}</span>
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
                                                cell.exists
                                                    ? e => handleCellHover(e, row, cell)
                                                    : undefined
                                            }
                                            onMouseLeave={cell.exists ? handleCellLeave : undefined}
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

                {/* Color Legend - Inside Card */}
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
            </div>

            {/* Summary Stats - Dashboard Style */}
            {/* Summary Stats - Dashboard Style */}
            <div className="stats-row heatmap-stats">
                {(() => {
                    // Calculate Volatility (Std Dev of monthly returns)
                    const monthlyReturns = portfolioRow.cells
                        .filter(c => c.exists) // Only consider months where portfolio existed
                        .map(c => c.changePercent);

                    let volatility = 0;
                    if (monthlyReturns.length > 0) {
                        const mean =
                            monthlyReturns.reduce((sum, val) => sum + val, 0) /
                            monthlyReturns.length;
                        const variance =
                            monthlyReturns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
                            monthlyReturns.length;
                        volatility = Math.sqrt(variance);
                    }

                    // Best and Worst Months
                    const bestMonth = monthlyReturns.length > 0 ? Math.max(...monthlyReturns) : 0;
                    const worstMonth = monthlyReturns.length > 0 ? Math.min(...monthlyReturns) : 0;

                    return (
                        <>
                            <div className="stat-card">
                                <div className="stat-card-label">Total Return</div>
                                <div
                                    className="stat-card-value"
                                    style={{
                                        color:
                                            portfolioRow.totalChange >= 0
                                                ? 'var(--accent-green)'
                                                : 'var(--accent-red)',
                                    }}
                                >
                                    {portfolioRow.totalChangePercent >= 0 ? '+' : ''}
                                    {portfolioRow.totalChangePercent.toFixed(1)}%
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-label">Volatility</div>
                                <div className="stat-card-value">{volatility.toFixed(1)}%</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-label">Best Month</div>
                                <div
                                    className="stat-card-value"
                                    style={{ color: 'var(--accent-green)' }}
                                >
                                    {bestMonth >= 0 ? '+' : ''}
                                    {bestMonth.toFixed(1)}%
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-label">Worst Month</div>
                                <div
                                    className="stat-card-value"
                                    style={{ color: 'var(--accent-red)' }}
                                >
                                    {worstMonth >= 0 ? '+' : ''}
                                    {worstMonth.toFixed(1)}%
                                </div>
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Tooltip */}
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
                            <strong>{tooltip.assetName}</strong>
                            {tooltip.category && (
                                <span className="tooltip-category">{tooltip.category}</span>
                            )}
                        </div>
                        <div className="tooltip-month">{formatFullMonthYear(tooltip.month)}</div>
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
                                    {/* Percent ALWAYS visible */}
                                    {tooltip.changePercent > 0 ? '+' : ''}
                                    {tooltip.changePercent.toFixed(2)}%
                                </span>
                            </div>
                            {tooltip.owner && (
                                <div className="tooltip-row">
                                    <span>Owner:</span>
                                    <span>{tooltip.owner}</span>
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
