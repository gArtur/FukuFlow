import { useState } from 'react';
import type { ValueEntry, Asset, Person } from '../types';
import { usePrivacy } from '../contexts/PrivacyContext';
import AssetHistoryTable from './AssetHistoryTable';
import MobileAssetHistory from './MobileAssetHistory';
import PaginationControls from './PaginationControls';
import { useSnapshotHistory } from '../hooks/useSnapshotHistory';
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

    // Delete confirmation state
    const [snapshotToDelete, setSnapshotToDelete] = useState<number | null>(null);

    // Process history to add derived fields (extracted to hook)
    const enhancedHistory = useSnapshotHistory(asset.valueHistory);

    // Pagination logic
    const totalPages = Math.ceil(enhancedHistory.length / ITEMS_PER_PAGE);

    // Reset page if needed (though simplified here as we mount new component for new asset usually)
    // If asset changes, we might want to reset, but React key on parent usually handles this.
    // We'll keep it simple.

    const paginatedHistory = enhancedHistory.slice(
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
        <div className="chart-card">
            <div className="chart-header">
                <div className="chart-header-left">
                    <h3 className="chart-title">Snapshot History</h3>
                </div>
                <div className="chart-header-right">
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

            <div className="history-content" style={{ padding: '0 1rem 1rem' }}>
                <AssetHistoryTable
                    history={paginatedHistory}
                    isHidden={isHidden}
                    formatAmount={formatAmount}
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
            </div>

            <ConfirmationModal
                isOpen={snapshotToDelete !== null}
                onClose={() => setSnapshotToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Snapshot?"
                message="Are you sure you want to delete this snapshot? This action cannot be undone."
                confirmLabel="Delete"
                isDangerous={true}
            />
        </div>
    );
}
