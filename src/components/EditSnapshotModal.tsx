import { useState, useEffect } from 'react';
import ConfirmationModal from './ConfirmationModal';

interface EditSnapshotModalProps {
    isOpen: boolean;
    onClose: () => void;
    snapshot: {
        id: number;
        date: string;
        value: number;
        investmentChange?: number;
        notes?: string;
    } | null;
    onSubmit: (id: number, data: { date: string; value: number; investmentChange: number; notes: string }) => void;
    onDelete: (id: number) => void;
}

// Helper functions
const parseValue = (val: string): number => {
    return parseFloat(val.replace(',', '.')) || 0;
};

const handleNumberInput = (inputValue: string, setter: (val: string) => void) => {
    if (inputValue === '' || /^[0-9]*[.,]?[0-9]*$/.test(inputValue)) {
        setter(inputValue);
    }
};

export default function EditSnapshotModal({ isOpen, onClose, snapshot, onSubmit, onDelete }: EditSnapshotModalProps) {
    const [date, setDate] = useState('');
    const [value, setValue] = useState('');
    const [investmentChange, setInvestmentChange] = useState('');
    const [notes, setNotes] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isOpen && snapshot) {
            setDate(snapshot.date.split('T')[0]);
            setValue(snapshot.value.toString());
            setInvestmentChange((snapshot.investmentChange || 0).toString());
            setNotes(snapshot.notes || '');
            setShowDeleteConfirm(false);
        }
    }, [isOpen, snapshot]);

    if (!isOpen || !snapshot) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(snapshot.id, {
            date: new Date(date).toISOString(),
            value: parseValue(value),
            investmentChange: parseValue(investmentChange),
            notes: notes.trim()
        });
        onClose();
    };

    const handleDelete = () => {
        onDelete(snapshot.id);
        onClose();
    };

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Edit Snapshot</h2>
                        <button className="modal-close" onClick={onClose}>×</button>
                    </div>

                    <form onSubmit={handleSubmit} className="modal-form">
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
                            <label>Value</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={value}
                                onChange={(e) => handleNumberInput(e.target.value, setValue)}
                                onFocus={(e) => e.target.select()}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Investment Change</label>
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
                                onFocus={(e) => e.target.select()}
                            />
                            <small className="form-hint">
                                Positive = money added, Negative = money withdrawn
                            </small>
                        </div>

                        <div className="form-group">
                            <label>Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={() => setShowDeleteConfirm(true)}>
                                Delete
                            </button>
                            <button type="submit" className="btn-primary">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Snapshot"
                message="Are you sure you want to delete this snapshot? This action cannot be undone."
                confirmLabel="Delete"
                isDangerous={true}
            />
        </>
    );
}
