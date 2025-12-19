import { useState, useEffect } from 'react';
import type { Asset, Person } from '../types';
import { parseValue, handleNumberInput, formatCurrency as formatCurrencyUtil } from '../utils';
import { useSettings } from '../contexts/SettingsContext';

interface AddSnapshotModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    assets?: Asset[]; // For global mode with investment selection
    persons?: Person[]; // For showing owner names
    onSubmit: (assetId: string, snapshot: { value: number; date: string; investmentChange: number; notes: string }) => void;
}

// Use settings-aware currency formatting
function useFormatCurrency() {
    const { currency } = useSettings();
    return (amount: number) => formatCurrencyUtil(amount, currency);
}

export default function AddSnapshotModal({ isOpen, onClose, asset, assets, persons, onSubmit }: AddSnapshotModalProps) {
    const formatCurrency = useFormatCurrency();
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

    const getOwnerName = (ownerId: string) => {
        return persons?.find(p => p.id === ownerId)?.name || 'Unknown';
    };

    const getAssetDisplayName = (a: Asset) => {
        const ownerName = getOwnerName(a.ownerId);
        const formattedValue = formatCurrency(a.currentValue);
        return `${a.name} (${ownerName}) - ${formattedValue}`;
    };

    useEffect(() => {
        if (isOpen) {
            if (asset) {
                setSelectedAssetId(asset.id);
                setSearchQuery(asset.name);
                setValue('');
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
            setValue('');
        }
    }, [activeAsset, asset]);

    if (!isOpen) return null;

    // Global mode: need to select an asset first
    const isGlobalMode = !asset && assets && assets.length > 0;

    // Filter assets based on search query (search by name or owner)
    // If the search query matches exactly the selected asset's display name, allow showing all options
    // This happens when user clicks the input after selection - we want to show all options
    // so they can switch, without needing to clear manually.
    const isExactMatch = activeAsset && searchQuery === getAssetDisplayName(activeAsset);

    const filteredAssets = isGlobalMode && assets
        ? (isExactMatch ? assets : assets.filter(a => {
            const ownerName = persons?.find(p => p.id === a.ownerId)?.name || '';
            const searchLower = searchQuery.toLowerCase();
            return a.name.toLowerCase().includes(searchLower) ||
                ownerName.toLowerCase().includes(searchLower);
        }))
        : [];



    const handleAssetSelect = (selectedAsset: Asset) => {
        setSelectedAssetId(selectedAsset.id);
        setSearchQuery(getAssetDisplayName(selectedAsset));
        setValue('');
        setShowSuggestions(false);
    };

    const currentValueNum = parseValue(value);
    const changeAmount = currentValueNum - lastValue;
    const changePercent = lastValue > 0 ? ((changeAmount / lastValue) * 100) : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value || !activeAsset) return;

        onSubmit(activeAsset.id, {
            value: currentValueNum,
            date: new Date(date).toISOString(),
            investmentChange: parseValue(investmentChange),
            notes: notes.trim()
        });
        onClose();
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
                                            setSelectedAssetId('');
                                        }
                                    }}
                                    onFocus={(e) => {
                                        setShowSuggestions(true);
                                        e.target.select();
                                    }}
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
                            type="text"
                            inputMode="decimal"
                            value={value}
                            onChange={(e) => handleNumberInput(e.target.value, setValue)}
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
                            type="text"
                            inputMode="decimal"
                            value={investmentChange}
                            onChange={(e) => {
                                // Allow negative sign at start for investment change
                                const val = e.target.value;
                                if (val === '' || val === '-' || /^-?[0-9]*[.,]?[0-9]*$/.test(val)) {
                                    setInvestmentChange(val);
                                }
                            }}
                            onBlur={() => {
                                // Clean up trailing delimiter or standalone minus
                                if (investmentChange === '-' || investmentChange.endsWith('.') || investmentChange.endsWith(',')) {
                                    setInvestmentChange(prev => prev.replace(/[-.,]+$/, ''));
                                }
                            }}
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
