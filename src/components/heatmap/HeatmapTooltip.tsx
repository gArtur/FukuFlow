import { createPortal } from 'react-dom';
import type { TooltipData } from './types';
import { getColorClass } from './heatmapUtils';
import { formatFullMonthYear } from '../../utils/dateUtils';

interface HeatmapTooltipProps {
    tooltip: TooltipData;
    isHidden: boolean;
    currency: string;
    formatAmount: (amount: number) => string;
}

export default function HeatmapTooltip({
    tooltip,
    isHidden,
    currency,
    formatAmount,
}: HeatmapTooltipProps) {
    const currencySymbol = currency === 'PLN' ? 'zł' : currency === 'USD' ? '$' : currency;
    const hiddenValue = `***** ${currencySymbol}`;

    return createPortal(
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
                    <span className={getColorClass(tooltip.changePercent)}>
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
    );
}
