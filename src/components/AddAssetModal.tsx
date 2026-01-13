import { useState } from 'react';
import type { Asset, AssetCategory, Person } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface AddAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (asset: Omit<Asset, 'id' | 'valueHistory'>) => void;
    editAsset?: Asset | null;
    onUpdate?: (id: string, updates: Partial<Omit<Asset, 'id' | 'valueHistory'>>) => void;
    persons: Person[];
}

export default function AddAssetModal({
    isOpen,
    onClose,
    onSubmit,
    editAsset,
    onUpdate,
    persons,
}: AddAssetModalProps) {
    const { categories } = useSettings();
    const [prevEditAssetId, setPrevEditAssetId] = useState(editAsset?.id);

    // Initialize state (logic handled in useState or prop change check)
    const [name, setName] = useState(editAsset?.name || '');
    const [category, setCategory] = useState<AssetCategory>(
        editAsset?.category || categories[0]?.key || 'stocks'
    );
    const [ownerId, setOwnerId] = useState(
        editAsset?.ownerId || (persons.length > 0 ? persons[0].id : '')
    );

    // Detect changes in editAsset prop (e.g. switching assets or switching between Add/Edit mode)
    if (editAsset?.id !== prevEditAssetId) {
        setPrevEditAssetId(editAsset?.id);
        if (editAsset) {
            setName(editAsset.name);
            setCategory(editAsset.category);
            setOwnerId(editAsset.ownerId);
        } else {
            // Reset for Add mode
            setName('');
            setCategory(categories[0]?.key || 'stocks');
            setOwnerId(persons.length > 0 ? persons[0].id : '');
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editAsset && onUpdate) {
            // When editing, only send fields that are actually editable in this view
            const updates = {
                name,
                category,
                ownerId,
            };
            onUpdate(editAsset.id, updates);
        } else {
            const assetData = {
                name,
                category,
                ownerId,
                purchaseDate: new Date().toISOString().split('T')[0],
                purchaseAmount: 0,
                currentValue: 0,
            };
            onSubmit(assetData);
        }

        onClose();
    };

    if (!isOpen) return null;

    const hasNoPersons = persons.length === 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{editAsset ? 'Edit Asset' : 'Add Asset'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>
                {hasNoPersons && !editAsset ? (
                    <div className="modal-body">
                        <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                            <div className="empty-icon">👤</div>
                            <h3 className="empty-title">No people configured</h3>
                            <p className="empty-text">
                                Before adding assets, you need to create at least one person. Go to{' '}
                                <strong>Settings → People</strong> to add family members or owners.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="form-submit"
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                            disabled
                        >
                            Add Asset
                        </button>
                    </div>
                ) : (
                    <form className="modal-body" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Asset Name</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g., Apple Stock, Bitcoin, Apartment"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-select"
                                    value={category}
                                    onChange={e => setCategory(e.target.value as AssetCategory)}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.key} value={cat.key}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Owner</label>
                                <select
                                    className="form-select"
                                    value={ownerId}
                                    onChange={e => setOwnerId(e.target.value)}
                                >
                                    {persons.map(person => (
                                        <option key={person.id} value={person.id}>
                                            {person.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button type="submit" className="form-submit">
                            {editAsset ? 'Save Changes' : 'Add Asset'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
