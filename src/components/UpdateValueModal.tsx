import { useState } from 'react';
import type { Asset } from '../types';
import { useFormatting } from '../hooks/useFormatting';

interface UpdateValueModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    onSubmit: (id: string, newValue: number) => void;
}

export default function UpdateValueModal({
    isOpen,
    onClose,
    asset,
    onSubmit,
}: UpdateValueModalProps) {
    const { formatCurrency } = useFormatting();
    // State derived from props pattern to avoid useEffect state updates
    const [newValue, setNewValue] = useState(asset?.currentValue.toString() || '');
    const [prevAssetId, setPrevAssetId] = useState(asset?.id);

    if (asset && asset.id !== prevAssetId) {
        setPrevAssetId(asset.id);
        setNewValue(asset.currentValue.toString());
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (asset && newValue) {
            onSubmit(asset.id, parseFloat(newValue));
            onClose();
        }
    };

    if (!isOpen || !asset) return null;

    const potentialGain = parseFloat(newValue) - asset.purchaseAmount;
    const potentialPercent =
        asset.purchaseAmount > 0 ? ((potentialGain / asset.purchaseAmount) * 100).toFixed(1) : '0';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Update Value</h2>
                    <button className="modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>
                <form className="modal-body" onSubmit={handleSubmit}>
                    <div
                        style={{
                            marginBottom: 'var(--space-lg)',
                            padding: 'var(--space-md)',
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-md)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '18px',
                                fontWeight: 600,
                                marginBottom: 'var(--space-xs)',
                            }}
                        >
                            {asset.name}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Purchased: {formatCurrency(asset.purchaseAmount)}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Current: {formatCurrency(asset.currentValue)}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">New Current Value (PLN)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                            required
                            min="0"
                            step="0.01"
                            autoFocus
                        />
                    </div>

                    {newValue && (
                        <div
                            style={{
                                padding: 'var(--space-md)',
                                background:
                                    potentialGain >= 0
                                        ? 'var(--accent-green-glow)'
                                        : 'var(--accent-red-glow)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--space-lg)',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                style={{
                                    color:
                                        potentialGain >= 0
                                            ? 'var(--accent-green)'
                                            : 'var(--accent-red)',
                                    fontWeight: 600,
                                    fontSize: '18px',
                                }}
                            >
                                {potentialGain >= 0 ? '+' : ''}
                                {formatCurrency(potentialGain)} ({potentialGain >= 0 ? '+' : ''}
                                {potentialPercent}%)
                            </div>
                        </div>
                    )}

                    <button type="submit" className="form-submit">
                        Update Value
                    </button>
                </form>
            </div>
        </div>
    );
}
