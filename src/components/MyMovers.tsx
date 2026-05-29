import { useMemo } from 'react';
import type { Asset, Person } from '../types';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useSettings } from '../contexts/SettingsContext';
import { usePortfolioPerformanceContext } from '../contexts/PortfolioPerformanceContext';
import { useAssetView } from '../hooks/useAssetView';
import { sortAssetRows, type AssetRow } from '../utils/assetSort';
import AssetCard from './AssetCard';
import AssetTable from './AssetTable';

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
    const { categories } = useSettings();
    const { formatAmount, isHidden } = usePrivacy();
    const { getAssetGain } = usePortfolioPerformanceContext();
    const { view, setView, sortBy, sortDir, setSort } = useAssetView();

    const rows = useMemo<AssetRow[]>(() => {
        if (view !== 'table') return [];
        return assets.map(asset => {
            const { gain, gainPercent, isPositive } = getAssetGain(asset);
            const owner = persons.find(p => p.id === asset.ownerId);
            return {
                asset,
                name: asset.name,
                categoryLabel:
                    categories.find(c => c.key === asset.category)?.label || asset.category,
                ownerName: owner?.name || 'Unknown',
                invested: asset.purchaseAmount,
                value: asset.currentValue,
                gain,
                gainPercent,
                isPositive,
            };
        });
    }, [view, assets, persons, categories, getAssetGain]);

    const sortedRows = useMemo(() => sortAssetRows(rows, sortBy, sortDir), [rows, sortBy, sortDir]);

    if (assets.length === 0) {
        return (
            <section className="movers-section">
                <div className="movers-header">
                    <div className="movers-header-left">
                        <h2 className="movers-title">My Assets</h2>
                        <span className="movers-count">0 assets</span>
                    </div>
                    <button
                        className="add-asset-btn-inline"
                        onClick={onAddAsset}
                        data-testid="add-asset-btn"
                    >
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

    const sortedAssets = [...assets].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <section className="movers-section">
            <div className="movers-header">
                <div className="movers-header-left">
                    <h2 className="movers-title">My Assets</h2>
                    <span className="movers-count">{assets.length} assets</span>
                </div>
                <div className="movers-header-right">
                    <div className="view-toggle" role="group" aria-label="Asset view">
                        <button
                            className={`view-tab ${view === 'cards' ? 'active' : ''}`}
                            onClick={() => setView('cards')}
                            aria-pressed={view === 'cards'}
                        >
                            Cards
                        </button>
                        <button
                            className={`view-tab ${view === 'table' ? 'active' : ''}`}
                            onClick={() => setView('table')}
                            aria-pressed={view === 'table'}
                        >
                            Table
                        </button>
                    </div>
                    <button
                        className="add-asset-btn-inline"
                        onClick={onAddAsset}
                        data-testid="add-asset-btn"
                    >
                        <span>+</span> Add Asset
                    </button>
                </div>
            </div>

            {view === 'cards' ? (
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
            ) : (
                <AssetTable
                    rows={sortedRows}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={setSort}
                    onRowClick={onCardClick}
                    onAddSnapshot={onAddSnapshot}
                    formatAmount={formatAmount}
                    isHidden={isHidden}
                />
            )}
        </section>
    );
}
