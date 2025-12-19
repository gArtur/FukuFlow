import { useState, useEffect } from 'react';
import type { Asset, AssetCategory, Person } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { parseValue, handleNumberInput } from '../utils';

interface AddAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (asset: Omit<Asset, 'id' | 'valueHistory'>) => void;
    editAsset?: Asset | null;
    onUpdate?: (id: string, updates: Partial<Omit<Asset, 'id' | 'valueHistory'>>) => void;
    persons: Person[];
}

export default function AddAssetModal({ isOpen, onClose, onSubmit, editAsset, onUpdate, persons }: AddAssetModalProps) {
    const { categories } = useSettings();
    const [name, setName] = useState('');
    const [category, setCategory] = useState<AssetCategory>(categories[0]?.key || 'stocks');
    const [ownerId, setOwnerId] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [purchaseAmount, setPurchaseAmount] = useState('');
    const [currentValue, setCurrentValue] = useState('');

    useEffect(() => {
        if (editAsset) {
            setName(editAsset.name);
            setCategory(editAsset.category);
            setOwnerId(editAsset.ownerId);
            setPurchaseDate(editAsset.purchaseDate);
            setPurchaseAmount(editAsset.purchaseAmount.toString());
            setCurrentValue(editAsset.currentValue.toString());
        } else {
            resetForm();
        }
    }, [editAsset, isOpen, persons]);

    const resetForm = () => {
        setName('');
        setCategory(categories[0]?.key || 'stocks');
        setOwnerId(persons.length > 0 ? persons[0].id : '');
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        setPurchaseAmount('');
        setCurrentValue('');
    };

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
                purchaseDate,
                purchaseAmount: parseValue(purchaseAmount),
                currentValue: parseValue(currentValue) || parseValue(purchaseAmount),
            };
            onSubmit(assetData);
        }

        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{editAsset ? 'Edit Investment' : 'Add Investment'}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form className="modal-body" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Investment Name</label>
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
                                    <option key={cat.key} value={cat.key}>{cat.label}</option>
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
                                    <option key={person.id} value={person.id}>{person.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!editAsset && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Purchase Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={purchaseDate}
                                    onChange={e => setPurchaseDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Purchase Amount (PLN)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="form-input"
                                        placeholder="0"
                                        value={purchaseAmount}
                                        onChange={e => handleNumberInput(e.target.value, setPurchaseAmount)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Current Value (PLN)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="form-input"
                                        placeholder="0"
                                        value={currentValue}
                                        onChange={e => handleNumberInput(e.target.value, setCurrentValue)}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <button type="submit" className="form-submit">
                        {editAsset ? 'Save Changes' : 'Add Investment'}
                    </button>
                </form>
            </div>
        </div>
    );
}
