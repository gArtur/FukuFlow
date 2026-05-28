import type { EnhancedSnapshot } from '../hooks/useSnapshotHistory';
import type { SortDirection } from './assetSort';

export type { SortDirection } from './assetSort';

export type SnapshotSortColumn = 'date' | 'value' | 'invested' | 'periodGL' | 'ytd' | 'cumulative';

const ACCESSOR: Record<SnapshotSortColumn, (s: EnhancedSnapshot) => number> = {
    date: s => new Date(s.date).getTime(),
    value: s => s.value,
    invested: s => s.cumInvested,
    periodGL: s => s.periodGLPercent,
    ytd: s => s.ytdROI,
    cumulative: s => s.roi,
};

/** Returns a new array sorted by the given column/direction. Does not mutate input. */
export function sortSnapshots(
    rows: EnhancedSnapshot[],
    column: SnapshotSortColumn,
    direction: SortDirection
): EnhancedSnapshot[] {
    const accessor = ACCESSOR[column];
    const factor = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => (accessor(a) - accessor(b)) * factor);
}
