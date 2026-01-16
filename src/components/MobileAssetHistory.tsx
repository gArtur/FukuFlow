import type { ValueEntry } from '../types';

interface ProcessedHistoryEntry extends ValueEntry {
    cumInvested: number;
    investmentChange?: number;
    periodGL: number;
    periodGLPercent: number;
    ytdGL: number;
    ytdROI: number;
    cumGL: number;
    roi: number;
    actualIndex: number;
}

interface MobileAssetHistoryProps {
    history: ProcessedHistoryEntry[];
    isHidden: boolean;
    formatAmount: (value: number) => string;
    onEditSnapshot: (snapshot: ValueEntry & { id: number }) => void;
    onDeleteSnapshot: (id: number) => void;
}

export default function MobileAssetHistory({
    history,
    isHidden,
    formatAmount,
    onEditSnapshot,
    onDeleteSnapshot,
}: MobileAssetHistoryProps) {
    return (
        <div className="mobile-history-list mobile-only">
            {history.map((entry, index) => (
                <div className="mobile-history-card" key={index}>
                    <div className="mobile-history-header">
                        <span className="mobile-history-date">
                            {new Date(entry.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="mobile-action-btn"
                                onClick={() =>
                                    onEditSnapshot({ ...entry, id: entry.id || entry.actualIndex })
                                }
                                disabled={isHidden}
                                title={isHidden ? 'Disabled in Private Mode' : 'Edit'}
                                style={isHidden ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                                Edit
                            </button>
                            <button
                                className="mobile-action-btn"
                                onClick={() => onDeleteSnapshot(entry.id || entry.actualIndex)}
                                disabled={isHidden}
                                title={isHidden ? 'Disabled in Private Mode' : 'Delete'}
                                style={isHidden ? { opacity: 0.5, cursor: 'not-allowed', color: 'var(--accent-red)' } : { color: 'var(--accent-red)' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>

                    <div className="mobile-history-row">
                        <span className="mobile-label">Value</span>
                        <span className="mobile-value">{formatAmount(entry.value)}</span>
                    </div>

                    <div className="mobile-history-row">
                        <span className="mobile-label">Invested</span>
                        <div style={{ textAlign: 'right' }}>
                            <div className="mobile-value">{formatAmount(entry.cumInvested)}</div>
                            {entry.investmentChange !== undefined &&
                                entry.investmentChange !== 0 && (
                                    <div
                                        className="mobile-sub-value"
                                        style={{
                                            color:
                                                entry.investmentChange > 0
                                                    ? 'var(--accent-primary)'
                                                    : 'var(--text-muted)',
                                        }}
                                    >
                                        {entry.investmentChange > 0 ? 'Inv +' : 'Inv '}
                                        {formatAmount(entry.investmentChange)}
                                    </div>
                                )}
                        </div>
                    </div>

                    <div className="mobile-history-row">
                        <span className="mobile-label">Period G/L</span>
                        <span
                            className={`mobile-value-inline ${entry.periodGL >= 0 ? 'text-green' : 'text-red'}`}
                        >
                            {entry.periodGLPercent >= 0 ? '+' : ''}
                            {entry.periodGLPercent.toFixed(2)}%
                            <span className="mobile-value-amount">
                                ({entry.periodGL >= 0 ? '+' : ''}
                                {formatAmount(entry.periodGL)})
                            </span>
                        </span>
                    </div>

                    <div className="mobile-history-row">
                        <span className="mobile-label">YTD</span>
                        <span
                            className={`mobile-value-inline ${entry.ytdROI >= 0 ? 'text-green' : 'text-red'}`}
                        >
                            {entry.ytdROI >= 0 ? '+' : ''}
                            {entry.ytdROI.toFixed(2)}%
                            <span className="mobile-value-amount">
                                ({entry.ytdGL >= 0 ? '+' : ''}
                                {formatAmount(entry.ytdGL)})
                            </span>
                        </span>
                    </div>

                    <div className="mobile-history-row">
                        <span className="mobile-label">Cumulative</span>
                        <span
                            className={`mobile-value-inline ${entry.roi >= 0 ? 'text-green' : 'text-red'}`}
                        >
                            {entry.roi >= 0 ? '+' : ''}
                            {entry.roi.toFixed(2)}%
                            <span className="mobile-value-amount">
                                ({entry.cumGL >= 0 ? '+' : ''}
                                {formatAmount(entry.cumGL)})
                            </span>
                        </span>
                    </div>

                    {entry.notes && <div className="mobile-notes">{entry.notes}</div>}
                </div>
            ))}
        </div>
    );
}
