import { useMemo, useState } from 'react';
import type { ValueEntry, Asset, Person } from '../types';
import { usePrivacy } from '../contexts/PrivacyContext';
import AssetHistoryTable from './AssetHistoryTable';
import MobileAssetHistory from './MobileAssetHistory';
import PaginationControls from './PaginationControls';
import { useSnapshotHistory } from '../hooks/useSnapshotHistory';
import { sortSnapshots, type SnapshotSortColumn, type SortDirection } from '../utils/snapshotSort';
import { exportSnapshotsToCsv } from '../utils/csvExport';
import ConfirmationModal from './ConfirmationModal';

interface SnapshotHistoryProps {
    asset: Asset;
    owner?: Person;
    onEditSnapshot: (snapshot: ValueEntry & { id: number }) => void;
    onDeleteSnapshot: (id: number) => void;
    onOpenImportModal: () => void;
}

export default function SnapshotHistory({
    asset,
    owner,
    onEditSnapshot,
    onDeleteSnapshot,
    onOpenImportModal,
}: SnapshotHistoryProps) {
    const { formatAmount, isHidden } = usePrivacy();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Sort state (defaults to most-recent-first, matching the raw history order)
    const [sortBy, setSortBy] = useState<SnapshotSortColumn>('date');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');

    // Delete confirmation state
    const [snapshotToDelete, setSnapshotToDelete] = useState<number | null>(null);

    // Process history to add derived fields (extracted to hook)
    const enhancedHistory = useSnapshotHistory(asset.valueHistory);

    const sortedHistory = useMemo(
        () => sortSnapshots(enhancedHistory, sortBy, sortDir),
        [enhancedHistory, sortBy, sortDir]
    );

    const handleSort = (column: SnapshotSortColumn) => {
        if (column === sortBy) {
            setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(column);
            setSortDir('desc');
        }
        setCurrentPage(1);
    };

    // Pagination logic
    const totalPages = Math.ceil(sortedHistory.length / ITEMS_PER_PAGE);

    const paginatedHistory = sortedHistory.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // CSV Export
    const handleExportCSV = () => {
        exportSnapshotsToCsv(enhancedHistory, asset.name, owner?.name);
    };

    const handleDeleteClick = (id: number) => {
        setSnapshotToDelete(id);
    };

    const handleConfirmDelete = () => {
        if (snapshotToDelete !== null) {
            onDeleteSnapshot(snapshotToDelete);
            setSnapshotToDelete(null);
        }
    };

    return (
        <section className="movers-section snapshot-history-section">
            <div className="movers-header">
                <div className="movers-header-left">
                    <h2 className="movers-title">Snapshot History</h2>
                </div>
                <div className="movers-header-right">
                    <div className="history-actions-group">
                        <button
                            onClick={handleExportCSV}
                            className="btn-small-outline"
                            disabled={isHidden}
                            title={isHidden ? 'Disabled in Private Mode' : 'Export CSV'}
                            style={isHidden ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                            Export CSV
                        </button>
                        <button
                            onClick={onOpenImportModal}
                            className="btn-small-outline"
                            disabled={isHidden}
                            title={isHidden ? 'Disabled in Private Mode' : 'Import CSV'}
                            style={isHidden ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                            Import CSV
                        </button>
                    </div>
                </div>
            </div>

            <AssetHistoryTable
                history={paginatedHistory}
                isHidden={isHidden}
                formatAmount={formatAmount}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
                onEditSnapshot={onEditSnapshot}
                onDeleteSnapshot={handleDeleteClick}
            />

            <MobileAssetHistory
                history={paginatedHistory}
                isHidden={isHidden}
                formatAmount={formatAmount}
                onEditSnapshot={onEditSnapshot}
                onDeleteSnapshot={handleDeleteClick}
            />

            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            <ConfirmationModal
                isOpen={snapshotToDelete !== null}
                onClose={() => setSnapshotToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Snapshot?"
                message="Are you sure you want to delete this snapshot? This action cannot be undone."
                confirmLabel="Delete"
                isDangerous={true}
            />
        </section>
    );
}
