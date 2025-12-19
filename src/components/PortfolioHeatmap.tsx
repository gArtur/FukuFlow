import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { usePrivacy } from '../contexts/PrivacyContext';
import type { Asset, Person } from '../types';
import { formatCurrency } from '../utils';
import {
    formatMonthLabel,
    formatFullMonthYear,
    getPreviousMonth,
    generateMonthRange
} from '../utils/dateUtils';

interface PortfolioHeatmapProps {
    assets: Asset[];
    persons: Person[];
}

interface HeatmapCell {
    month: string;           // "2024-01", "2024-02", etc.
    value: number;           // Current value
    previousValue: number;   // Previous month value
    change: number;          // Change in PLN
    changePercent: number;   // Change percentage
    hasData: boolean;        // Whether this month had actual data
    exists: boolean;         // Whether the asset existed in this month
    isInception: boolean;    // Whether this is the first month of data
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
    const { defaultFilter, isLoading: settingsLoading } = useSettings();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<ViewMode>('percent');
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // Sync with default filter from settings
    useEffect(() => {
        if (!settingsLoading) {
            setSelectedPersonId((defaultFilter && defaultFilter !== 'all') ? defaultFilter : null);
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
    const visibleMonths = useMemo(() => generateMonthRange(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

    // Get person name by ID
    const getPersonName = useCallback((ownerId: string): string => {
        const person = persons.find(p => p.id === ownerId);
        return person?.name || 'Unknown';
    }, [persons]);

    // Helper function to process a single asset's data into heatmap rows
    const processAssetData = useCallback((asset: Asset): HeatmapRow => {
        // Create a map of month -> value and investment changes from valueHistory
        const monthlyValues = new Map<string, number>();
        const monthlyInvestmentChanges = new Map<string, number>();

        // Sort value history by date
        const sorted = [...asset.valueHistory].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Find the first month when this asset had any data (inception month)
        const firstDataMonth = sorted.length > 0
            ? sorted[0].date.substring(0, 7)
            : null;

        // Use last value of each month and sum investment changes
        sorted.forEach(entry => {
            const month = entry.date.substring(0, 7);
            monthlyValues.set(month, entry.value);
            const currentInvest = monthlyInvestmentChanges.get(month) || 0;
            monthlyInvestmentChanges.set(month, currentInvest + (entry.investmentChange || 0));
        });

        // Forward-fill: for each visible month, use actual value or carry forward
        const cells: HeatmapCell[] = [];
        let lastKnownValue = 0; // Start at 0 to correctly capture initial investment as flow/gain
        let assetExists = false; // Track whether we've reached the asset's first data

        // First, find the value just before our range starts (for proper first month calculation)
        const monthsBeforeRange = generateMonthRange(minMonth, getPreviousMonth(rangeStart));
        monthsBeforeRange.forEach(month => {
            if (monthlyValues.has(month)) {
                lastKnownValue = monthlyValues.get(month)!;
                assetExists = true;
            }
            // Check if we've reached or passed the inception month
            if (firstDataMonth && month >= firstDataMonth) {
                assetExists = true;
            }
        });

        let previousValue = lastKnownValue;

        visibleMonths.forEach(month => {
            // Check if we've reached the inception month
            const isInception = month === firstDataMonth;
            if (firstDataMonth && month >= firstDataMonth) {
                assetExists = true;
            }
            const hasData = monthlyValues.has(month);
            const value = hasData ? monthlyValues.get(month)! : lastKnownValue;
            const monthlyInvest = monthlyInvestmentChanges.get(month) || 0;

            // For inception month, the previousValue is effectively 0 for G/L calculation
            // but any monthlyInvest in that month acts as the capital basis.
            const prevValueForCalc = isInception ? 0 : previousValue;
            const change = assetExists ? (value - prevValueForCalc - monthlyInvest) : 0;

            // Basis for percentage is the capital at risk: previous value + new investment
            const basis = prevValueForCalc + monthlyInvest;
            const changePercent = assetExists && basis !== 0 ? (change / basis) * 100 : 0;

            cells.push({
                month,
                value: assetExists ? value : 0,
                previousValue: assetExists ? (isInception ? monthlyInvest : previousValue) : 0,
                change,
                changePercent,
                hasData,
                exists: assetExists,
                isInception
            });

            // Always store the monthly flow for total portfolio calculation
            (cells[cells.length - 1] as any).monthlyFlow = assetExists ? monthlyInvest : 0;

            if (assetExists) {
                previousValue = value;
                lastKnownValue = value;
            }
        });

        // Calculate totals for the visible range based on summed monthly G/L
        const totalChange = cells.reduce((sum, c) => sum + c.change, 0);
        const totalFlow = cells.reduce((sum, c) => sum + ((c as any).monthlyFlow || 0), 0);

        // ROI Basis: If asset started in the first visible month, startValue is 0 (flow is in totalFlow)
        // If asset existed before, startValue is its carry-over value.
        const startValueBasis = (cells.length > 0 && !cells[0].isInception) ? cells[0].previousValue : 0;
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
            endValue
        };
    }, [visibleMonths, rangeStart, minMonth, getPersonName]);

    // Generate Heatmap Data
    const heatmapData = useMemo(() => {
        // Use filteredAssets for the heatmap rows
        return filteredAssets.map(asset => processAssetData(asset));
    }, [filteredAssets, processAssetData]);

    // Helper to format values for display - MASKS CURRENCY IN PRIVACY MODE
    const formatValue = (val: number, isCurrency: boolean = false) => {
        if (isCurrency && isHidden) return '***** zł';
        if (isCurrency) return formatCurrency(val);
        // Percentages are ALWAYS visible
        if (val > 0) return `+${val.toFixed(1)}%`;
        return `${val.toFixed(1)}%`;
    };

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
                isInception: false // Portfolio as a whole doesn't have an inception month
            };
        });

        const totalChange = cells.reduce((sum, c) => sum + c.change, 0);

        // Final Summary Basis: (Assets that existed before range start) + (Total flows during range)
        let initialPortfolioBasis = 0;
        let totalFlowInRange = 0;

        heatmapData.forEach(row => {
            if (row.cells.length > 0) {
                const firstCell = row.cells[0];
                if (!firstCell.isInception) {
                    initialPortfolioBasis += firstCell.previousValue;
                }
                row.cells.forEach(cell => {
                    totalFlowInRange += (cell as any).monthlyFlow || 0;
                });
            }
        });

        const basis = initialPortfolioBasis + totalFlowInRange;
        const totalChangePercent = basis > 0 ? (totalChange / basis) * 100 : 0;
        const startValue = cells.length > 0 ? cells[0].previousValue : 0;
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
            endValue
        };
    }, [heatmapData, visibleMonths]);

    // Handle cell hover
    const handleCellHover = (
        event: React.MouseEvent,
        row: HeatmapRow,
        cell: HeatmapCell
    ) => {
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
            previousValue: cell.previousValue
        });
    };

    const handleCellLeave = () => {
        setTooltip(null);
    };

    // Format display value based on mode and privacy
    const formatCellValue = (cell: HeatmapCell) => {
        if (!cell.exists) return ''; // Empty for non-existing periods
        if (cell.isInception) return 'START'; // Mark inception cells

        // Allow display if asset exists (forward filled) even if !hasData

        if (viewMode === 'percent') {
            // Percentages are allowed even in privacy mode
            if (cell.changePercent > 0) return `+${cell.changePercent.toFixed(1)}%`;
            return `${cell.changePercent.toFixed(1)}%`;
        }

        // Detailed value view - mask if hidden
        if (isHidden) return '*****';
        const sign = cell.change >= 0 ? '+' : '';
        return `${sign}${(cell.change / 1000).toFixed(2)}k`;
    };

    // Slider index helpers
    const startIndex = allMonths.indexOf(rangeStart);
    const endIndex = allMonths.indexOf(rangeEnd);

    return (
        <div className="heatmap-container">
            {/* Header */}
            <div className="heatmap-header">
                <div className="heatmap-title-section">
                    <h2 className="heatmap-main-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                        Portfolio Efficiency Analysis
                    </h2>
                    <p className="heatmap-subtitle">
                        Heatmap showing monthly value changes
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="heatmap-controls">
                <div className="heatmap-slider-section">
                    <label className="slider-label">Time Range</label>
                    <div className="range-slider-container">
                        <input
                            type="range"
                            min={0}
                            max={allMonths.length - 1}
                            value={startIndex}
                            onChange={(e) => {
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
                            onChange={(e) => {
                                const newEnd = allMonths[parseInt(e.target.value)];
                                if (newEnd >= rangeStart) setRangeEnd(newEnd);
                            }}
                            className="range-slider range-slider-end"
                        />
                        <div
                            className="range-slider-track"
                            style={{
                                left: `${(startIndex / (allMonths.length - 1)) * 100}%`,
                                width: `${((endIndex - startIndex) / (allMonths.length - 1)) * 100}%`
                            }}
                        />
                    </div>
                    <div className="range-labels">
                        <span>{formatMonthLabel(rangeStart)}</span>
                        <span className="range-separator">→</span>
                        <span>{formatMonthLabel(rangeEnd)}</span>
                    </div>
                </div>

                {/* Controls Header */}
                <div className="heatmap-header-controls">
                    <div className="filter-group">
                        <button
                            className={`filter-btn ${!selectedPersonId ? 'active' : ''}`}
                            onClick={() => setSelectedPersonId(null)}
                        >
                            All
                        </button>
                        {persons.map(person => (
                            <button
                                key={person.id}
                                className={`filter-btn ${selectedPersonId === person.id ? 'active' : ''}`}
                                onClick={() => setSelectedPersonId(person.id)}
                            >
                                {person.name}
                            </button>
                        ))}
                    </div>

                    <div className="view-mode-toggle">
                        <button
                            className={`view-mode-btn ${viewMode === 'percent' ? 'active' : ''}`}
                            onClick={() => setViewMode('percent')}
                        >
                            % Change
                        </button>
                        <button
                            className={`view-mode-btn ${viewMode === 'value' ? 'active' : ''}`}
                            onClick={() => setViewMode('value')}
                        >
                            Value
                        </button>
                    </div>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="heatmap-grid-wrapper" ref={gridRef}>
                {/* Month Headers */}
                <div className="heatmap-month-header">
                    <div className="heatmap-asset-name-header">Asset</div>
                    {visibleMonths.map(month => (
                        <div key={month} className="heatmap-month">
                            {formatMonthLabel(month)}
                        </div>
                    ))}
                    <div className="heatmap-total-header">Total</div>
                </div>

                {/* Portfolio Total Row */}
                <div className="heatmap-row portfolio-total">
                    <div className="heatmap-asset-name">
                        <span className="asset-icon portfolio-icon">★</span>
                        <span className="asset-name-text">{portfolioRow.name}</span>
                    </div>
                    {portfolioRow.cells.map(cell => (
                        <div
                            key={cell.month}
                            className={`heatmap-cell ${getColorClass(cell.changePercent)}`}
                            onMouseEnter={(e) => handleCellHover(e, portfolioRow, cell)}
                            onMouseLeave={handleCellLeave}
                        >
                            {formatCellValue(cell)}
                        </div>
                    ))}
                    <div className={`heatmap-cell-total ${portfolioRow.totalChangePercent >= 0 ? 'positive' : 'negative'}`}>
                        {viewMode === 'percent'
                            ? `${portfolioRow.totalChangePercent >= 0 ? '+' : ''}${portfolioRow.totalChangePercent.toFixed(1)}%`
                            : (isHidden ? '*****' : formatCurrency(portfolioRow.totalChange))
                        }
                    </div>
                </div>

                {/* Asset Rows */}
                {heatmapData.map(row => (
                    <div key={row.id} className="heatmap-row">
                        <div
                            className="heatmap-asset-name clickable"
                            onClick={() => navigate(`/asset/${row.id}`)}
                            title={`View ${row.name} details`}
                        >
                            <span className="asset-icon">{row.category.charAt(0).toUpperCase()}</span>
                            <div className="asset-name-details">
                                <span className="asset-name-text">{row.name}</span>
                                <span className="asset-owner-badge">{row.ownerName}</span>
                            </div>
                        </div>
                        {row.cells.map(cell => (
                            <div
                                key={cell.month}
                                className={`heatmap-cell ${cell.exists ? (cell.isInception ? 'inception' : getColorClass(cell.changePercent)) : 'not-exists'} ${cell.exists && !cell.hasData ? 'no-data' : ''}`}
                                onMouseEnter={cell.exists ? (e) => handleCellHover(e, row, cell) : undefined}
                                onMouseLeave={cell.exists ? handleCellLeave : undefined}
                            >
                                {formatCellValue(cell)}
                            </div>
                        ))}
                        <div className={`heatmap-cell-total ${row.totalChangePercent >= 0 ? 'positive' : 'negative'}`}>
                            {viewMode === 'percent'
                                ? `${row.totalChangePercent >= 0 ? '+' : ''}${row.totalChangePercent.toFixed(1)}%`
                                : (isHidden ? '*****' : formatCurrency(row.totalChange))
                            }
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary Stats */}
            <div className="heatmap-summary">
                <div className="heatmap-stat-card">
                    <div className="stat-label">Starting Value</div>
                    <div className="stat-value">{formatValue(portfolioRow.startValue, true)}</div>
                </div>
                <div className="heatmap-stat-card">
                    <div className="stat-label">Ending Value</div>
                    <div className="stat-value">{formatValue(portfolioRow.endValue, true)}</div>
                </div>
                <div className="heatmap-stat-card">
                    <div className="stat-label">Change</div>
                    <div className={`stat-value ${portfolioRow.totalChange >= 0 ? 'positive' : 'negative'}`}>
                        {formatValue(portfolioRow.totalChange, true)}
                        <span className="stat-percent">({formatValue(portfolioRow.totalChangePercent)})</span>
                    </div>
                </div>
                <div className="heatmap-stat-card">
                    <div className="stat-label">Period</div>
                    <div className="stat-value" style={{ fontSize: '15px' }}>
                        {formatMonthLabel(rangeStart)} - {formatMonthLabel(rangeEnd)}
                    </div>
                </div>
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

            {/* Tooltip */}
            {tooltip && createPortal(
                <div
                    className="heatmap-tooltip"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="tooltip-header">
                        <strong>{tooltip.assetName}</strong>
                        {tooltip.category && <span className="tooltip-category">{tooltip.category}</span>}
                    </div>
                    <div className="tooltip-month">{formatFullMonthYear(tooltip.month)}</div>
                    <div className="tooltip-stats">
                        <div className="tooltip-row">
                            <span>Start Value:</span>
                            <span>{isHidden ? '***** zł' : formatCurrency(tooltip.previousValue)}</span>
                        </div>
                        <div className="tooltip-row">
                            <span>End Value:</span>
                            <span>{isHidden ? '***** zł' : formatCurrency(tooltip.value)}</span>
                        </div>
                        <div className="tooltip-row">
                            <span>Result:</span>
                            <span className={tooltip.change >= 0 ? 'gain-text' : 'loss-text'}>
                                {isHidden ? '***** zł' : formatCurrency(tooltip.change)}
                            </span>
                        </div>
                        <div className="tooltip-row grand-total">
                            <span>Change:</span>
                            <span className={getColorClass(tooltip.changePercent)}>
                                {/* Percent ALWAYS visible */}
                                {tooltip.changePercent > 0 ? '+' : ''}{tooltip.changePercent.toFixed(2)}%
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
        </div>
    );
}
