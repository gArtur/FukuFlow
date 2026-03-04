import { createPortal } from 'react-dom';
import type { TooltipData } from './types';
import { formatFullMonthYear } from '../../utils/dateUtils';

interface HeatmapTooltipProps {
    tooltip: TooltipData;
    isHidden: boolean;
    currency: string;
    formatAmount: (amount: number) => string;
    /** On touch/mobile, render as a bottom drawer instead of a floating bubble */
    drawerMode?: boolean;
    onClose?: () => void;
}

/** Shared tooltip content rendered in both floating and drawer modes */
function TooltipContent({
    tooltip,
    isHidden,
    currency,
    formatAmount,
}: Omit<HeatmapTooltipProps, 'drawerMode' | 'onClose'>) {
    const currencySymbol = currency === 'PLN' ? 'zł' : currency === 'USD' ? '$' : currency;
    const hiddenValue = `***** ${currencySymbol}`;

    return (
        <>
            <div className="tooltip-header">
                <strong>{tooltip.assetName}</strong>
                {tooltip.category && <span className="tooltip-category">{tooltip.category}</span>}
            </div>
            <div className="tooltip-month">{formatFullMonthYear(tooltip.month)}</div>
            <div className="tooltip-stats">
                <div className="tooltip-row">
                    <span>Start Value:</span>
                    <span>{isHidden ? hiddenValue : formatAmount(tooltip.previousValue)}</span>
                </div>
                <div className="tooltip-row">
                    <span>End Value:</span>
                    <span>{isHidden ? hiddenValue : formatAmount(tooltip.value)}</span>
                </div>
                <div className="tooltip-row">
                    <span>Result:</span>
                    <span className={tooltip.change >= 0 ? 'gain-text' : 'loss-text'}>
                        {isHidden ? hiddenValue : formatAmount(tooltip.change)}
                    </span>
                </div>
                <div className="tooltip-row grand-total">
                    <span>Change:</span>
                    <span
                        className={
                            tooltip.changePercent > 0
                                ? 'positive'
                                : tooltip.changePercent < 0
                                  ? 'negative'
                                  : ''
                        }
                    >
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
        </>
    );
}

export default function HeatmapTooltip({
    tooltip,
    isHidden,
    currency,
    formatAmount,
    drawerMode = false,
    onClose,
}: HeatmapTooltipProps) {
    const contentProps = { tooltip, isHidden, currency, formatAmount };

    if (drawerMode) {
        return createPortal(
            <>
                {/* Backdrop */}
                <div className="heatmap-drawer-backdrop" onClick={onClose} />
                <div className="heatmap-tooltip-drawer">
                    <div className="heatmap-drawer-handle" />
                    <TooltipContent {...contentProps} />
                </div>
            </>,
            document.body
        );
    }

    return createPortal(
        <div
            className="heatmap-tooltip"
            style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(-50%, -100%)',
            }}
        >
            <TooltipContent {...contentProps} />
        </div>,
        document.body
    );
}
