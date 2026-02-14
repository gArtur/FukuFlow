import { useState } from 'react';
import type { Asset, Person } from '../types';
import { parseValue, handleNumberInput, formatCurrency as formatCurrencyUtil } from '../utils';
import { useSettings } from '../contexts/SettingsContext';

interface AddSnapshotModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    assets?: Asset[]; // For global mode with investment selection
    persons?: Person[]; // For showing owner names
    onSubmit: (
        assetId: string,
        snapshot: { value: number; date: string; investmentChange: number; notes: string }
    ) => void;
}

// Use settings-aware currency formatting
function useFormatCurrency() {
    const { currency } = useSettings();
    return (amount: number, decimals: number = 0) => formatCurrencyUtil(amount, currency, decimals);
}

export default function AddSnapshotModal({
    isOpen,
    onClose,
    asset,
    assets,
    persons,
    onSubmit,
}: AddSnapshotModalProps) {
    const formatCurrency = useFormatCurrency();
    const [selectedAssetId, setSelectedAssetId] = useState<string>(asset?.id || '');
    // Initial search query based on incoming asset or empty
    const [searchQuery, setSearchQuery] = useState<string>(asset?.name || '');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [value, setValue] = useState('');
    const [investmentChange, setInvestmentChange] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Determine the active asset (either passed directly or selected from dropdown)
    // We name this variable distinct from the state update logic to avoid confusion
    const activeAssetProvidedByState = assets?.find(a => a.id === selectedAssetId) ?? null;

    // Track previous asset to detect prop changes
    const [prevAssetId, setPrevAssetId] = useState(asset?.id);

    const [wasOpen, setWasOpen] = useState(isOpen);

    if (isOpen && !wasOpen) {
        // Modal just opened: Reset form
        setWasOpen(true);
        // If we have a fixed asset, ensure it's selected
        if (asset) {
            if (selectedAssetId !== asset.id) setSelectedAssetId(asset.id);
            setSearchQuery(asset.name);
        } else {
            // Global mode reset
            if (activeAssetProvidedByState && activeAssetProvidedByState.id !== selectedAssetId) {
                // If we want to persist selection, do nothing. If we want to clear:
                setSelectedAssetId('');
                setSearchQuery('');
            }
        }
        setValue('');
        setInvestmentChange('');
        setNotes('');
        setDate(new Date().toISOString().split('T')[0]);
        setShowSuggestions(false);
    } else if (!isOpen && wasOpen) {
        setWasOpen(false);
    }

    const activeAsset = asset || activeAssetProvidedByState;
    const lastValue = activeAsset?.currentValue || 0;

    const getOwnerName = (ownerId: string) => {
        return persons?.find(p => p.id === ownerId)?.name || 'Unknown';
    };

    const getAssetDisplayName = (a: Asset) => {
        const ownerName = getOwnerName(a.ownerId);
        const formattedValue = formatCurrency(a.currentValue);
        return `${a.name} (${ownerName}) - ${formattedValue}`;
    };

    // Detect asset prop change while open
    if (asset && asset.id !== prevAssetId) {
        setPrevAssetId(asset.id);
        setSelectedAssetId(asset.id);
        setSearchQuery(asset.name);
        setValue('');
    }

    // Auto-clear value if the selected asset changes in global mode (activeAsset changes)
    const [prevActiveAssetId, setPrevActiveAssetId] = useState(activeAsset?.id);
    if (activeAsset?.id !== prevActiveAssetId) {
        setPrevActiveAssetId(activeAsset?.id);
        setValue('');
    }

    if (!isOpen) return null;

    // Global mode: need to select an asset first
    const isGlobalMode = !asset && assets && assets.length > 0;

    // Filter assets based on search query (search by name or owner)
    // If the search query matches exactly the selected asset's display name, allow showing all options
    // This happens when user clicks the input after selection - we want to show all options
    // so they can switch, without needing to clear manually.
    const isExactMatch = activeAsset && searchQuery === getAssetDisplayName(activeAsset);

    const filteredAssets =
        isGlobalMode && assets
            ? (isExactMatch
                  ? assets
                  : assets.filter(a => {
                        const ownerName = persons?.find(p => p.id === a.ownerId)?.name || '';
                        const searchLower = searchQuery.toLowerCase();
                        return (
                            a.name.toLowerCase().includes(searchLower) ||
                            ownerName.toLowerCase().includes(searchLower)
                        );
                    })
              ).sort((a, b) => a.name.localeCompare(b.name))
            : [];

    const handleAssetSelect = (selectedAsset: Asset) => {
        setSelectedAssetId(selectedAsset.id);
        setSearchQuery(getAssetDisplayName(selectedAsset));
        setValue('');
        setShowSuggestions(false);
    };

    const currentValueNum = parseValue(value);
    const investmentChangeNum = parseValue(investmentChange);

    // Market Gain = (Current Value - Last Value) - Net Investment Change
    // e.g. Start 1000, Add 500, End 1600.
    // Total diff = 600. Market Gain = 600 - 500 = 100.
    // Fix floating point precision issues (e.g. -0.0000001 becoming -0)
    let marketGain = currentValueNum - lastValue - investmentChangeNum;
    if (Math.abs(marketGain) < 0.0001) marketGain = 0;

    // Adjusted start value (basis) for percentage calculation
    const adjustedStartValue = lastValue + investmentChangeNum;

    const marketGainPercent = adjustedStartValue > 0 ? (marketGain / adjustedStartValue) * 100 : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value || !activeAsset) return;

        onSubmit(activeAsset.id, {
            value: currentValueNum,
            date: new Date(date).toISOString(),
            investmentChange: parseValue(investmentChange),
            notes: notes.trim(),
        });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Add Snapshot</h2>
                    <button className="modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {isGlobalMode && (
                        <div className="form-group">
                            <label>Select Asset</label>
                            <div className="combobox-container">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => {
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
                                    onFocus={e => {
                                        setShowSuggestions(true);
                                        e.target.select();
                                    }}
                                    placeholder="Type to search assets..."
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
                                                <span className="combobox-option-name">
                                                    {a.name}
                                                </span>
                                                <span className="combobox-option-owner">
                                                    ({getOwnerName(a.ownerId)})
                                                </span>
                                                <span className="combobox-option-value">
                                                    - {formatCurrency(a.currentValue)}
                                                </span>
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
                            <div className="snapshot-stats-row">
                                <div className="snapshot-stat">
                                    <span className="stat-label">Last value:</span>
                                    <span className="stat-value">{formatCurrency(lastValue)}</span>
                                </div>
                                <div className="snapshot-stat">
                                    <span className="stat-label">Current invested:</span>
                                    <span className="stat-value">
                                        {formatCurrency(activeAsset.purchaseAmount)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Current Value</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={value}
                            onChange={e => handleNumberInput(e.target.value, setValue)}
                            placeholder="Enter new value"
                            required
                        />
                        {value && (
                            <div
                                className={`value-change-indicator ${marketGain > 0 ? 'positive' : marketGain < 0 ? 'negative' : 'neutral'}`}
                            >
                                {marketGain === 0 ? (
                                    'No Change'
                                ) : (
                                    <>
                                        {marketGain > 0 ? 'Gain: +' : 'Loss: '}
                                        {formatCurrency(marketGain, 2)}
                                        {` (${marketGainPercent >= 0 ? '+' : ''}${marketGainPercent.toFixed(2)}%)`}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Investment Change (+ add / - withdraw)</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={investmentChange}
                            onChange={e => {
                                // Allow negative sign at start for investment change
                                const val = e.target.value;
                                if (
                                    val === '' ||
                                    val === '-' ||
                                    /^-?[0-9]*[.,]?[0-9]*$/.test(val)
                                ) {
                                    setInvestmentChange(val);
                                }
                            }}
                            onBlur={() => {
                                // Clean up trailing delimiter or standalone minus
                                if (
                                    investmentChange === '-' ||
                                    investmentChange.endsWith('.') ||
                                    investmentChange.endsWith(',')
                                ) {
                                    setInvestmentChange(prev => prev.replace(/[-.,]+$/, ''));
                                }
                            }}
                            placeholder="e.g., 500 or -200"
                        />
                        <div className="investment-change-preview">
                            <small className="form-hint">
                                Positive = money added, Negative = money withdrawn
                            </small>
                            {investmentChangeNum !== 0 && activeAsset && (
                                <div className="new-invested-total">
                                    New total invested:{' '}
                                    <strong>
                                        {formatCurrency(
                                            activeAsset.purchaseAmount + investmentChangeNum
                                        )}
                                    </strong>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
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
