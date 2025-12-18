import { useState, useEffect } from 'react';
import type { Asset, Person } from '../types';

interface AddSnapshotModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    assets?: Asset[]; // For global mode with investment selection
    persons?: Person[]; // For showing owner names
    onSubmit: (assetId: string, snapshot: { value: number; date: string; investmentChange: number; notes: string }) => void;
}

export default function AddSnapshotModal({ isOpen, onClose, asset, assets, persons, onSubmit }: AddSnapshotModalProps) {
    const [selectedAssetId, setSelectedAssetId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [value, setValue] = useState('');
    const [investmentChange, setInvestmentChange] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Determine the active asset (either passed directly or selected from dropdown)
    const activeAsset = asset || (assets?.find(a => a.id === selectedAssetId) ?? null);
    const lastValue = activeAsset?.currentValue || 0;

    useEffect(() => {
        if (isOpen) {
            if (asset) {
                setSelectedAssetId(asset.id);
                // When pre-selected (not global mode), we might keeps simple name or full format?
                // The Modal usually shows separate info in non-global mode.
                // But lines 156-163 handle non-global mode display.
                // The request specifically talked about "Investment selection" which implies Global Mode.
                // So line 30 can probably stay as is or be updated if we want consistency, 
                // but checking line 107 "isGlobalMode" wraps the combobox.
                // If not global mode, the combobox isn't shown, so line 30 affects what? 
                // Line 113 uses searchQuery. If !isGlobalMode, the input isn't rendered.
                // So this block is fine as is for now, but let's check line 118 logic later.
                setSearchQuery(asset.name);
                setValue(asset.currentValue.toString());
            } else if (assets && assets.length > 0) {
                setSelectedAssetId('');
                setSearchQuery('');
                setValue('');
            }
            setInvestmentChange('0');
            setNotes('');
            setDate(new Date().toISOString().split('T')[0]);
            setShowSuggestions(false);
        }
    }, [isOpen, asset, assets]);

    // Update value when selected asset changes
    useEffect(() => {
        if (activeAsset && !asset) {
            setValue(activeAsset.currentValue.toString());
        }
    }, [activeAsset, asset]);

    if (!isOpen) return null;

    // Global mode: need to select an asset first
    const isGlobalMode = !asset && assets && assets.length > 0;

    // Filter assets based on search query (search by name or owner)
    const filteredAssets = isGlobalMode && assets
        ? assets.filter(a => {
            const ownerName = persons?.find(p => p.id === a.ownerId)?.name || '';
            const searchLower = searchQuery.toLowerCase();
            return a.name.toLowerCase().includes(searchLower) ||
                ownerName.toLowerCase().includes(searchLower);
        })
        : [];

    const getOwnerName = (ownerId: string) => {
        return persons?.find(p => p.id === ownerId)?.name || 'Unknown';
    };

    const handleAssetSelect = (selectedAsset: Asset) => {
        setSelectedAssetId(selectedAsset.id);
        const formattedValue = formatCurrency(selectedAsset.currentValue);
        const ownerName = getOwnerName(selectedAsset.ownerId);
        // Format: Name (Owner) - Value
        setSearchQuery(`${selectedAsset.name} (${ownerName}) - ${formattedValue}`);
        setValue(selectedAsset.currentValue.toString());
        setShowSuggestions(false);
    };

    const currentValueNum = parseFloat(value) || 0;
    const changeAmount = currentValueNum - lastValue;
    const changePercent = lastValue > 0 ? ((changeAmount / lastValue) * 100) : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value || !activeAsset) return;

        onSubmit(activeAsset.id, {
            value: currentValueNum,
            date: new Date(date).toISOString(),
            investmentChange: parseFloat(investmentChange) || 0,
            notes: notes.trim()
        });
        onClose();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add Snapshot</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {isGlobalMode && (
                        <div className="form-group">
                            <label>Select Investment</label>
                            <div className="combobox-container">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowSuggestions(true);
                                        // Clear selection if user is typing something new
                                        // We check if the current input matches the selected asset's formatted string or name
                                        // But easier is just: if we are typing, we are likely searching or clearing.
                                        if (activeAsset) {
                                            // Ideally we want to clear if the user changes the text meaningfully,
                                            // but for now clearing on any change while active is safer/simpler or we need better logic.
                                            // However, if they just backspace, they might want to search again.
                                            setSelectedAssetId('');
                                        }
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    placeholder="Type to search investments..."
                                    className="combobox-input"
                                    autoComplete="off"
                                />
                                {showSuggestions && filteredAssets.length > 0 && (
                                    <ul className="combobox-suggestions">
                                        {filteredAssets.map(a => (
                                            <li
                                                key={a.id}
                                                className={`combobox-option ${a.id === selectedAssetId ? 'selected' : ''}`}
                                                onClick={() => handleAssetSelect(a)}
                                            >
                                                <span className="combobox-option-name">{a.name}</span>
                                                <span className="combobox-option-owner">({getOwnerName(a.ownerId)})</span>
                                                <span className="combobox-option-value">- {formatCurrency(a.currentValue)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {showSuggestions && searchQuery && filteredAssets.length === 0 && (
                                    <div className="combobox-no-results">No investments found</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Show info only when not in global mode (asset passed directly) */}
                    {!isGlobalMode && activeAsset && (
                        <div className="snapshot-info">
                            <div className="snapshot-asset-name">{activeAsset.name}</div>
                            <div className="snapshot-last-value">
                                Last value: <strong>{formatCurrency(lastValue)}</strong>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Current Value</label>
                        <input
                            type="number"
                            step="0.01"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Enter new value"
                            required
                        />
                        {value && (
                            <div className={`value-change-indicator ${changeAmount >= 0 ? 'positive' : 'negative'}`}>
                                {changeAmount >= 0 ? '+' : ''}{formatCurrency(changeAmount)}
                                ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Investment Change (+ add / - withdraw)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={investmentChange}
                            onChange={(e) => setInvestmentChange(e.target.value)}
                            placeholder="e.g., 500 or -200"
                        />
                        <small className="form-hint">
                            Positive = money added, Negative = money withdrawn
                        </small>
                    </div>

                    <div className="form-group">
                        <label>Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g., Bonus at work, Monthly contribution..."
                            rows={3}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            Save Snapshot
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
