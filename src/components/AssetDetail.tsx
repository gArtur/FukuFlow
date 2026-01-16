import { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';
import type { Asset, Person, ValueEntry } from '../types';
import TotalWorthChart from './TotalWorthChart';
import AssetHeatmap from './AssetHeatmap';
import { useSettings } from '../contexts/SettingsContext';
import SnapshotHistory from './SnapshotHistory';
import AssetHero from './AssetHero';

interface AssetDetailProps {
    asset: Asset;
    persons: Person[];
    onEdit: () => void;
    onDelete: () => void;
    onEditSnapshot: (snapshot: ValueEntry & { id: number }) => void;
    onDeleteSnapshot: (id: number) => void;
    onOpenImportModal: () => void;
}

export default function AssetDetail({
    asset,
    persons,
    onEdit,
    onDelete,
    onEditSnapshot,
    onDeleteSnapshot,
    onOpenImportModal,
}: AssetDetailProps) {
    const { showAssetHeatmap } = useSettings();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const owner = persons.find(p => p.id === asset.ownerId);
    const gain = asset.currentValue - asset.purchaseAmount;
    const gainPercent = asset.purchaseAmount > 0 ? (gain / asset.purchaseAmount) * 100 : 0;

    const handleDelete = () => {
        onDelete();
        setShowDeleteConfirm(false);
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

            {/* Monthly Returns Heatmap */}
            {showAssetHeatmap && (
                <div className="mb-8">
                    <AssetHeatmap asset={asset} />
                </div>
            )}

            {/* History List (Unified) */}
            <SnapshotHistory
                asset={asset}
                owner={owner}
                onEditSnapshot={onEditSnapshot}
                onDeleteSnapshot={onDeleteSnapshot}
                onOpenImportModal={onOpenImportModal}
            />

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Asset?"
                message={`Are you sure you want to delete "${asset.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                isDangerous={true}
            />
        </div>
    );
}
