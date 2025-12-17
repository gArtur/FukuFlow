import type { Asset, Person } from '../types';
import { CATEGORY_LABELS } from '../types';

interface AssetListProps {
    assets: Asset[];
    persons: Person[];
    onUpdateValue: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (asset: Asset) => void;
}

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

export default function AssetList({ assets, persons, onUpdateValue, onDelete, onEdit }: AssetListProps) {
    if (assets.length === 0) {
        return (
            <section className="assets-section">
                <div className="section-header">
                    <h2 className="section-title">Investments</h2>
                    <span className="section-count">0 assets</span>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">💰</div>
                    <h3 className="empty-title">No investments yet</h3>
                    <p className="empty-text">Tap the + button to add your first investment</p>
                </div>
            </section>
        );
    }

    return (
        <section className="assets-section">
            <div className="section-header">
                <h2 className="section-title">Investments</h2>
                <span className="section-count">{assets.length} assets</span>
            </div>
            <div className="assets-list">
                {assets.map(asset => {
                    const gain = asset.currentValue - asset.purchaseAmount;
                    const gainPercent = asset.purchaseAmount > 0
                        ? ((gain / asset.purchaseAmount) * 100).toFixed(1)
                        : '0';
                    const isPositive = gain >= 0;
                    const owner = persons.find(p => p.id === asset.ownerId);
                    const ownerName = owner?.name || 'Unknown';

                    return (
                        <div key={asset.id} className="asset-card">
                            <div className="asset-card-header">
                                <div className="asset-info">
                                    <div className="asset-name">{asset.name}</div>
                                    <div className="asset-meta">
                                        <span className="asset-category">{CATEGORY_LABELS[asset.category]}</span>
                                        <span className="asset-owner-badge">{ownerName}</span>
                                    </div>
                                </div>
                                <div className="asset-value">
                                    <div className="asset-current">{formatCurrency(asset.currentValue)}</div>
                                    <div className={`asset-gain ${isPositive ? 'positive' : 'negative'}`}>
                                        {isPositive ? '+' : ''}{formatCurrency(gain)} ({isPositive ? '+' : ''}{gainPercent}%)
                                    </div>
                                </div>
                            </div>
                            <div className="asset-actions">
                                <button
                                    className="asset-btn asset-btn-primary"
                                    onClick={() => onUpdateValue(asset.id)}
                                >
                                    Update Value
                                </button>
                                <button
                                    className="asset-btn asset-btn-secondary"
                                    onClick={() => onEdit(asset)}
                                >
                                    Edit
                                </button>
                                <button
                                    className="asset-btn asset-btn-danger"
                                    onClick={() => onDelete(asset.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
