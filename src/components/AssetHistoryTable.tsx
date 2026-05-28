import type { ValueEntry } from '../types';
import type { EnhancedSnapshot } from '../hooks/useSnapshotHistory';
import type { SnapshotSortColumn, SortDirection } from '../utils/snapshotSort';

interface AssetHistoryTableProps {
    history: EnhancedSnapshot[];
    isHidden: boolean;
    formatAmount: (value: number) => string;
    sortBy: SnapshotSortColumn;
    sortDir: SortDirection;
    onSort: (column: SnapshotSortColumn) => void;
    onEditSnapshot: (snapshot: ValueEntry & { id: number }) => void;
    onDeleteSnapshot: (id: number) => void;
}

interface ColumnDef {
    key: SnapshotSortColumn;
    label: string;
}

const COLUMNS: ColumnDef[] = [
    { key: 'date', label: 'Date' },
    { key: 'value', label: 'Value' },
    { key: 'invested', label: 'Invested' },
    { key: 'periodGL', label: 'Period G/L' },
    { key: 'ytd', label: 'YTD' },
    { key: 'cumulative', label: 'Cumulative' },
];

function SortIndicator({ active, dir }: { active: boolean; dir: SortDirection }) {
    if (!active) return null;
    return <span className="asset-sort-arrow">{dir === 'asc' ? '▲' : '▼'}</span>;
}

const EditIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const DeleteIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

export default function AssetHistoryTable({
    history,
    isHidden,
    formatAmount,
    sortBy,
    sortDir,
    onSort,
    onEditSnapshot,
    onDeleteSnapshot,
}: AssetHistoryTableProps) {
    return (
        <div className="asset-table-wrap history-table-wrap desktop-only">
            <table className="asset-table">
                <thead>
                    <tr>
                        {COLUMNS.map(col => {
                            const active = sortBy === col.key;
                            return (
                                <th
                                    key={col.key}
                                    aria-sort={
                                        active
                                            ? sortDir === 'asc'
                                                ? 'ascending'
                                                : 'descending'
                                            : 'none'
                                    }
                                >
                                    <button
                                        type="button"
                                        className={`asset-th-btn ${active ? 'active' : ''}`}
                                        onClick={() => onSort(col.key)}
                                    >
                                        {col.label}
                                        <SortIndicator active={active} dir={sortDir} />
                                    </button>
                                </th>
                            );
                        })}
                        <th className="asset-th--action" aria-label="Actions" />
                    </tr>
                </thead>
                <tbody>
                    {history.map((entry, index) => {
                        const snapshotId = entry.id || entry.actualIndex;
                        return (
                            <tr
                                key={index}
                                className={`asset-row ${isHidden ? '' : 'clickable'}`}
                                onClick={
                                    isHidden
                                        ? undefined
                                        : () => onEditSnapshot({ ...entry, id: snapshotId })
                                }
                            >
                                <td>
                                    <div style={{ fontWeight: 500 }}>
                                        {new Date(entry.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </div>
                                    {entry.notes && (
                                        <div
                                            style={{
                                                fontSize: '12px',
                                                color: 'var(--text-muted)',
                                                maxWidth: '200px',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {entry.notes}
                                        </div>
                                    )}
                                </td>
                                <td>{formatAmount(entry.value)}</td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span>{formatAmount(entry.cumInvested)}</span>
                                        {entry.investmentChange !== undefined &&
                                            entry.investmentChange !== 0 && (
                                                <span
                                                    style={{
                                                        fontSize: '11px',
                                                        color:
                                                            entry.investmentChange > 0
                                                                ? 'var(--accent-primary)'
                                                                : 'var(--text-muted)',
                                                    }}
                                                >
                                                    {entry.investmentChange > 0 ? '+' : '-'}
                                                    {formatAmount(Math.abs(entry.investmentChange))}
                                                </span>
                                            )}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span
                                            className={
                                                entry.periodGL >= 0 ? 'text-green' : 'text-red'
                                            }
                                            style={{ fontWeight: 600, fontSize: '14px' }}
                                        >
                                            {entry.periodGLPercent >= 0 ? '+' : ''}
                                            {entry.periodGLPercent.toFixed(2)}%
                                        </span>
                                        <span
                                            style={{ fontSize: '11px', opacity: 0.8 }}
                                            className={
                                                entry.periodGL >= 0 ? 'text-green' : 'text-red'
                                            }
                                        >
                                            {entry.periodGL >= 0 ? '+' : ''}
                                            {formatAmount(entry.periodGL)}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span
                                            className={entry.ytdROI >= 0 ? 'text-green' : 'text-red'}
                                            style={{ fontWeight: 600, fontSize: '14px' }}
                                        >
                                            {entry.ytdROI >= 0 ? '+' : ''}
                                            {entry.ytdROI.toFixed(2)}%
                                        </span>
                                        <span
                                            style={{ fontSize: '11px', opacity: 0.8 }}
                                            className={entry.ytdGL >= 0 ? 'text-green' : 'text-red'}
                                        >
                                            {entry.ytdGL >= 0 ? '+' : ''}
                                            {formatAmount(entry.ytdGL)}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span
                                            className={entry.roi >= 0 ? 'text-green' : 'text-red'}
                                            style={{ fontWeight: 600, fontSize: '14px' }}
                                        >
                                            {entry.roi >= 0 ? '+' : ''}
                                            {entry.roi.toFixed(2)}%
                                        </span>
                                        <span
                                            style={{ fontSize: '11px', opacity: 0.8 }}
                                            className={entry.cumGL >= 0 ? 'text-green' : 'text-red'}
                                        >
                                            {entry.cumGL >= 0 ? '+' : ''}
                                            {formatAmount(entry.cumGL)}
                                        </span>
                                    </div>
                                </td>
                                <td className="asset-th--action">
                                    <div className="history-row-actions">
                                        <button
                                            className="table-action-btn"
                                            onClick={e => {
                                                e.stopPropagation();
                                                onEditSnapshot({ ...entry, id: snapshotId });
                                            }}
                                            disabled={isHidden}
                                            aria-label="Edit snapshot"
                                            title={isHidden ? 'Disabled in Private Mode' : 'Edit'}
                                            style={
                                                isHidden
                                                    ? { opacity: 0.5, cursor: 'not-allowed' }
                                                    : {}
                                            }
                                            data-testid="snapshot-row-edit"
                                        >
                                            <EditIcon />
                                        </button>
                                        <button
                                            className="table-action-btn danger"
                                            onClick={e => {
                                                e.stopPropagation();
                                                onDeleteSnapshot(snapshotId);
                                            }}
                                            disabled={isHidden}
                                            aria-label="Delete snapshot"
                                            title={isHidden ? 'Disabled in Private Mode' : 'Delete'}
                                            style={
                                                isHidden
                                                    ? { opacity: 0.5, cursor: 'not-allowed' }
                                                    : {}
                                            }
                                            data-testid="snapshot-row-delete"
                                        >
                                            <DeleteIcon />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
