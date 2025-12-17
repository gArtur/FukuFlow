import type { Asset, Person } from '../types';
import AssetCard from './AssetCard';

interface MyMoversProps {
    assets: Asset[];
    persons: Person[];
    onCardClick: (asset: Asset) => void;
    onAddSnapshot: (asset: Asset) => void;
}

export default function MyMovers({ assets, persons, onCardClick, onAddSnapshot }: MyMoversProps) {
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
                        persons={persons}
                        onCardClick={onCardClick}
                        onAddSnapshot={onAddSnapshot}
                    />
                ))}
            </div>
        </section>
    );
}
