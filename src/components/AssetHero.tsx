import BackButton from './BackButton';
import type { Asset, Person } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface AssetHeroProps {
    asset: Asset;
    owner: Person | undefined;
    onEdit: () => void;
    onDeleteClick: () => void;
}

export default function AssetHero({ asset, owner, onEdit, onDeleteClick }: AssetHeroProps) {
    const { categories } = useSettings();
    const categoryLabel = categories.find(c => c.key === asset.category)?.label || asset.category;

    return (
        <div className="detail-hero" style={{ marginBottom: '24px' }}>
            <div className="detail-title-row" style={{ alignItems: 'center', marginBottom: 0, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <BackButton />
                    <h1 className="detail-title">{asset.name}</h1>
                    <span className="detail-pill">
                        {categoryLabel}
                    </span>

                    <span className="detail-owner-text" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span style={{ color: 'var(--text-primary)' }}>{owner?.name || 'Unknown'}</span>
                    </span>

                    <div className="detail-actions" style={{ marginLeft: '16px' }}>
                        <button
                            className="detail-action-btn"
                            onClick={onEdit}
                            title="Edit Asset"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </button>
                        <button
                            className="detail-action-btn danger"
                            onClick={onDeleteClick}
                            title="Delete Asset"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
