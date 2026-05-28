import type { Asset } from '../types';
import type { AssetRow, AssetSortColumn, SortDirection } from '../utils/assetSort';
import PersonBadge from './PersonBadge';

interface AssetTableProps {
    /** Rows in the order they should be displayed (already sorted by the parent). */
    rows: AssetRow[];
    sortBy: AssetSortColumn;
    sortDir: SortDirection;
    onSort: (column: AssetSortColumn) => void;
    onRowClick: (asset: Asset) => void;
    onAddSnapshot: (asset: Asset) => void;
    /** Privacy-aware currency formatter (masks values when hidden). */
    formatAmount: (value: number) => string;
    isHidden: boolean;
}

interface ColumnDef {
    key: AssetSortColumn;
    label: string;
    numeric?: boolean;
    /** Responsive class: column is hidden below the matching breakpoint. */
    responsive?: string;
}

// Priority order for mobile: Name / Value / % are always visible; the rest are
// revealed progressively as the viewport widens (see .asset-col--* in index.css).
const COLUMNS: ColumnDef[] = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category', responsive: 'asset-col--md' },
    { key: 'owner', label: 'Owner', responsive: 'asset-col--lg' },
    { key: 'invested', label: 'Invested', numeric: true, responsive: 'asset-col--sm' },
    { key: 'value', label: 'Value', numeric: true },
    { key: 'gain', label: 'Gain', numeric: true, responsive: 'asset-col--xs' },
    { key: 'gainPercent', label: '%', numeric: true },
];

function SortIndicator({ active, dir }: { active: boolean; dir: SortDirection }) {
    if (!active) return null;
    return <span className="asset-sort-arrow">{dir === 'asc' ? '▲' : '▼'}</span>;
}

export default function AssetTable({
    rows,
    sortBy,
    sortDir,
    onSort,
    onRowClick,
    onAddSnapshot,
    formatAmount,
    isHidden,
}: AssetTableProps) {
    return (
        <div className="asset-table-wrap">
            <table className="asset-table">
                <thead>
                    <tr>
                        {COLUMNS.map(col => {
                            const active = sortBy === col.key;
                            return (
                                <th
                                    key={col.key}
                                    className={[
                                        col.numeric ? 'asset-th--num' : '',
                                        col.responsive ?? '',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
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
                    {rows.map(row => (
                        <tr
                            key={row.asset.id}
                            className="asset-row clickable"
                            data-testid="asset-row"
                            data-asset-name={row.name}
                            onClick={() => onRowClick(row.asset)}
                        >
                            <td className="asset-cell-name">{row.name}</td>
                            <td className="asset-col--md">{row.categoryLabel}</td>
                            <td className="asset-col--lg">
                                <PersonBadge name={row.ownerName} />
                            </td>
                            <td className="asset-th--num asset-col--sm">
                                {formatAmount(row.invested)}
                            </td>
                            <td className="asset-th--num asset-cell-value">
                                {formatAmount(row.value)}
                            </td>
                            <td
                                className={`asset-th--num asset-col--xs ${
                                    row.isPositive ? 'positive' : 'negative'
                                }`}
                            >
                                {row.isPositive ? '+' : ''}
                                {formatAmount(row.gain)}
                            </td>
                            <td
                                className={`asset-th--num ${
                                    row.isPositive ? 'positive' : 'negative'
                                }`}
                            >
                                {row.isPositive ? '+' : ''}
                                {row.gainPercent.toFixed(1)}%
                            </td>
                            <td className="asset-th--action">
                                <button
                                    type="button"
                                    className="snapshot-btn"
                                    aria-label={`Add snapshot for ${row.name}`}
                                    title={isHidden ? 'Disabled in Private Mode' : 'Add Snapshot'}
                                    disabled={isHidden}
                                    onClick={
                                        isHidden
                                            ? undefined
                                            : e => {
                                                  e.stopPropagation();
                                                  onAddSnapshot(row.asset);
                                              }
                                    }
                                >
                                    +
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
