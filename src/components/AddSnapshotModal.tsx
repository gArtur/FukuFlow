import { useState, useEffect } from 'react';
import type { Asset } from '../types';

interface AddSnapshotModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    onSubmit: (assetId: string, snapshot: { value: number; date: string; investmentChange: number; notes: string }) => void;
}

export default function AddSnapshotModal({ isOpen, onClose, asset, onSubmit }: AddSnapshotModalProps) {
    const [value, setValue] = useState('');
    const [investmentChange, setInvestmentChange] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const lastValue = asset?.currentValue || 0;

    useEffect(() => {
        if (isOpen && asset) {
            setValue(asset.currentValue.toString());
            setInvestmentChange('0');
            setNotes('');
            setDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, asset]);

    if (!isOpen || !asset) return null;

    const currentValueNum = parseFloat(value) || 0;
    const changeAmount = currentValueNum - lastValue;
    const changePercent = lastValue > 0 ? ((changeAmount / lastValue) * 100) : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value) return;

        onSubmit(asset.id, {
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
                    <div className="snapshot-info">
                        <div className="snapshot-asset-name">{asset.name}</div>
                        <div className="snapshot-last-value">
                            Last value: <strong>{formatCurrency(lastValue)}</strong>
                        </div>
                    </div>

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
