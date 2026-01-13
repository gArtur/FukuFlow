import { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';
import type { Asset, Person, ValueEntry } from '../types';
import { usePrivacy } from '../contexts/PrivacyContext';
import TotalWorthChart from './TotalWorthChart';
import { useSnapshotHistory } from '../hooks/useSnapshotHistory';
import { exportSnapshotsToCsv } from '../utils/csvExport';

// Sub-components
import AssetHero from './AssetHero';
import AssetHistoryTable from './AssetHistoryTable';
import MobileAssetHistory from './MobileAssetHistory';
import PaginationControls from './PaginationControls';

interface AssetDetailProps {
    asset: Asset;
    persons: Person[];
    onEdit: () => void;
    onDelete: () => void;
    onEditSnapshot: (snapshot: ValueEntry & { id: number }) => void;
    onOpenImportModal: () => void;
}

export default function AssetDetail({
    asset,
    persons,
    onEdit,
    onDelete,
    onEditSnapshot,
    onOpenImportModal
}: AssetDetailProps) {
    const { formatAmount, isHidden } = usePrivacy();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [prevAssetId, setPrevAssetId] = useState(asset.id);

    // Reset page when asset changes
    if (asset.id !== prevAssetId) {
        setPrevAssetId(asset.id);
        setCurrentPage(1);
    }

    // Independent variables
    const ITEMS_PER_PAGE = 10;

    const owner = persons.find(p => p.id === asset.ownerId);
    const gain = asset.currentValue - asset.purchaseAmount;
    const gainPercent = asset.purchaseAmount > 0 ? ((gain / asset.purchaseAmount) * 100) : 0;

    // Process history to add derived fields (extracted to hook)
    const enhancedHistory = useSnapshotHistory(asset.valueHistory);

    // Pagination logic
    const totalPages = Math.ceil(enhancedHistory.length / ITEMS_PER_PAGE);
    const paginatedHistory = enhancedHistory.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleDelete = () => {
        onDelete();
        setShowDeleteConfirm(false);
    };

    // CSV Export (extracted to utility)
    const handleExportCSV = () => {
        exportSnapshotsToCsv(enhancedHistory, asset.name, owner?.name);
    };

    return (
        <div className="asset-detail">

            <AssetHero
                asset={asset}
                owner={owner}
                onEdit={onEdit}
                onDeleteClick={() => setShowDeleteConfirm(true)}
            />

            {/* Main Chart */}
            <div className="mb-8">
                <TotalWorthChart
                    assets={[asset]}
                    stats={{ totalGain: gain, gainPercentage: gainPercent }}
                    title="Performance History"
                />
            </div>

            {/* History List (Compact) */}
            <div className="history-card">
                <div className="history-header-row">
                    <h3 className="history-title">Snapshot History</h3>
                    <div className="history-actions-group">
                        <button
                            onClick={handleExportCSV}
                            className="btn-small-outline"
                            disabled={isHidden}
                            title={isHidden ? "Disabled in Private Mode" : "Export CSV"}
                            style={isHidden ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                            Export CSV
                        </button>
                        <button
                            onClick={onOpenImportModal}
                            className="btn-small-outline"
                            disabled={isHidden}
                            title={isHidden ? "Disabled in Private Mode" : "Import CSV"}
                            style={isHidden ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                            Import CSV
                        </button>
                    </div>
                </div>

                <AssetHistoryTable
                    history={paginatedHistory}
                    isHidden={isHidden}
                    formatAmount={formatAmount}
                    onEditSnapshot={onEditSnapshot}
                />

                <MobileAssetHistory
                    history={paginatedHistory}
                    isHidden={isHidden}
                    formatAmount={formatAmount}
                    onEditSnapshot={onEditSnapshot}
                />

                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Asset?"
                message={`Are you sure you want to delete "${asset.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                isDangerous={true}
            />
        </div >
    );
}
