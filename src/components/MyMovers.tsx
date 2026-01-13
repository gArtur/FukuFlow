import type { Asset, Person } from '../types';
import AssetCard from './AssetCard';

interface MyMoversProps {
    assets: Asset[];
    persons: Person[];
    onCardClick: (asset: Asset) => void;
    onAddSnapshot: (asset: Asset) => void;
    onAddAsset: () => void;
}

export default function MyMovers({
    assets,
    persons,
    onCardClick,
    onAddSnapshot,
    onAddAsset,
}: MyMoversProps) {
    if (assets.length === 0) {
        return (
            <section className="movers-section">
                <div className="movers-header">
                    <div className="movers-header-left">
                        <h2 className="movers-title">My Assets</h2>
                        <span className="movers-count">0 assets</span>
                    </div>
                    <button className="add-asset-btn-inline" onClick={onAddAsset}>
                        <span>+</span> Add Asset
                    </button>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">💰</div>
                    <h3 className="empty-title">No assets yet</h3>
                    {persons.length === 0 ? (
                        <p className="empty-text">
                            Before adding assets, you need to create at least one person in{' '}
                            <strong>Settings → People</strong>
                        </p>
                    ) : (
                        <p className="empty-text">Tap the + button to add your first asset</p>
                    )}
                </div>
            </section>
        );
    }

    const sortedAssets = [...assets].sort((a, b) => {
        return a.name.localeCompare(b.name);
    });

    return (
        <section className="movers-section">
            <div className="movers-header">
                <div className="movers-header-left">
                    <h2 className="movers-title">My Assets</h2>
                    <span className="movers-count">{assets.length} assets</span>
                </div>
                <button className="add-asset-btn-inline" onClick={onAddAsset}>
                    <span>+</span> Add Asset
                </button>
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
