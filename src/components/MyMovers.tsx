import type { Asset } from '../types';
import AssetCard from './AssetCard';

interface MyMoversProps {
    assets: Asset[];
    personLabels: Record<string, string>;
    onUpdateValue: (id: string) => void;
    onEdit: (asset: Asset) => void;
    onDelete: (id: string) => void;
}

export default function MyMovers({ assets, personLabels, onUpdateValue, onEdit, onDelete }: MyMoversProps) {
    if (assets.length === 0) {
        return (
            <section className="movers-section">
                <div className="movers-header">
                    <h2 className="movers-title">My Investments</h2>
                    <span className="movers-count">0 assets</span>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">💰</div>
                    <h3 className="empty-title">No investments yet</h3>
                    <p className="empty-text">Tap the + button to add your first investment</p>
                </div>
            </section>
        );
    }

    // Sort by absolute gain (biggest movers first)
    const sortedAssets = [...assets].sort((a, b) => {
        const gainA = Math.abs(a.currentValue - a.purchaseAmount);
        const gainB = Math.abs(b.currentValue - b.purchaseAmount);
        return gainB - gainA;
    });

    return (
        <section className="movers-section">
            <div className="movers-header">
                <h2 className="movers-title">My Investments</h2>
                <span className="movers-count">{assets.length} assets</span>
            </div>
            <div className="movers-grid">
                {sortedAssets.map(asset => (
                    <AssetCard
                        key={asset.id}
                        asset={asset}
                        personLabels={personLabels}
                        onUpdateValue={onUpdateValue}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </section>
    );
}
