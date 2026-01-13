import type { EnhancedSnapshot } from '../hooks/useSnapshotHistory';

/**
 * Sanitize a string for use in a filename
 */
function sanitizeFilename(str: string): string {
    return str.replace(/[\\/:*?"<>|]/g, '_');
}

/**
 * Export snapshots to a CSV file and trigger download.
 *
 * @param snapshots - Enhanced snapshot data to export
 * @param assetName - Name of the asset (for filename)
 * @param ownerName - Name of the owner (for filename)
 */
export function exportSnapshotsToCsv(
    snapshots: EnhancedSnapshot[],
    assetName: string,
    ownerName: string = 'Unknown'
): void {
    const headers = ['Date', 'Value', 'Investment Change', 'Notes'];

    // Sort chronologically for export (oldest first)
    const sortedSnapshots = [...snapshots].reverse();

    const rows = sortedSnapshots.map(snapshot => [
        new Date(snapshot.date).toISOString().split('T')[0],
        snapshot.value.toString(),
        (snapshot.investmentChange || 0).toString(),
        `"${(snapshot.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().split('T')[0];
    const sanitizedOwner = sanitizeFilename(ownerName);
    const sanitizedAsset = sanitizeFilename(assetName);
    link.download = `${dateStr} ${sanitizedOwner} - ${sanitizedAsset}.csv`;
    link.click();
}
