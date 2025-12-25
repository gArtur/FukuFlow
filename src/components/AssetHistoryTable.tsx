import type { ValueEntry } from '../types';

interface ProcessedHistoryEntry extends ValueEntry {
    cumInvested: number;
    investmentChange: number;
    periodGL: number;
    periodGLPercent: number;
    ytdGL: number;
    ytdROI: number;
    cumGL: number;
    roi: number;
    actualIndex: number; // Added since the hook provides it or we map it
}

interface AssetHistoryTableProps {
    history: ProcessedHistoryEntry[];
    isHidden: boolean;
    formatAmount: (value: number) => string;
    onEditSnapshot: (snapshot: ValueEntry & { id: number }) => void;
}

export default function AssetHistoryTable({ history, isHidden, formatAmount, onEditSnapshot }: AssetHistoryTableProps) {
    return (
        <div className="compact-table-container desktop-only">
            <table className="compact-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Value</th>
                        <th>Invested</th>
                        <th>Period G/L</th>
                        <th>YTD</th>
                        <th>Cumulative</th>
                        <th className="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((entry, index) => (
                        <tr key={index}>
                            <td>
                                <div style={{ fontWeight: 500 }}>
                                    {new Date(entry.date).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                </div>
                                {entry.notes && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {entry.notes}
                                    </div>
                                )}
                            </td>
                            <td>
                                {formatAmount(entry.value)}
                            </td>
                            <td>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>{formatAmount(entry.cumInvested)}</span>
                                    {entry.investmentChange !== undefined && entry.investmentChange !== 0 && (
                                        <span style={{ fontSize: '11px', color: entry.investmentChange > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                                            {entry.investmentChange > 0 ? '+' : '-'}{formatAmount(Math.abs(entry.investmentChange))}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span className={entry.periodGL >= 0 ? 'text-green' : 'text-red'} style={{ fontWeight: 600, fontSize: '14px' }}>
                                        {entry.periodGLPercent >= 0 ? '+' : ''}{entry.periodGLPercent.toFixed(2)}%
                                    </span>
                                    <span style={{ fontSize: '11px', opacity: 0.8 }} className={entry.periodGL >= 0 ? 'text-green' : 'text-red'}>
                                        {entry.periodGL >= 0 ? '+' : ''}{formatAmount(entry.periodGL)}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span className={entry.ytdROI >= 0 ? 'text-green' : 'text-red'} style={{ fontWeight: 600, fontSize: '14px' }}>
                                        {entry.ytdROI >= 0 ? '+' : ''}{entry.ytdROI.toFixed(2)}%
                                    </span>
                                    <span style={{ fontSize: '11px', opacity: 0.8 }} className={entry.ytdGL >= 0 ? 'text-green' : 'text-red'}>
                                        {entry.ytdGL >= 0 ? '+' : ''}{formatAmount(entry.ytdGL)}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span className={entry.roi >= 0 ? 'text-green' : 'text-red'} style={{ fontWeight: 600, fontSize: '14px' }}>
                                        {entry.roi >= 0 ? '+' : ''}{entry.roi.toFixed(2)}%
                                    </span>
                                    <span style={{ fontSize: '11px', opacity: 0.8 }} className={entry.cumGL >= 0 ? 'text-green' : 'text-red'}>
                                        {entry.cumGL >= 0 ? '+' : ''}{formatAmount(entry.cumGL)}
                                    </span>
                                </div>
                            </td>
                            <td className="text-right">
                                <button
                                    className="table-action-btn"
                                    onClick={() => onEditSnapshot({ ...entry, id: entry.id || entry.actualIndex })}
                                    disabled={isHidden}
                                    title={isHidden ? "Disabled in Private Mode" : "Edit"}
                                    style={isHidden ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                >
                                    Edit
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
