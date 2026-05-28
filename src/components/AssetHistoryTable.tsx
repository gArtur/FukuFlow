import type { ValueEntry } from '../types';
import type { EnhancedSnapshot } from '../hooks/useSnapshotHistory';
import type { SnapshotSortColumn, SortDirection } from '../utils/snapshotSort';
import SnapshotActions from './SnapshotActions';

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
                                            className={
                                                entry.ytdROI >= 0 ? 'text-green' : 'text-red'
                                            }
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
                                    <SnapshotActions
                                        isHidden={isHidden}
                                        onEdit={() => onEditSnapshot({ ...entry, id: snapshotId })}
                                        onDelete={() => onDeleteSnapshot(snapshotId)}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
