import { useState, useEffect } from 'react';

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
            value: parseFloat(value) || 0,
            investmentChange: parseFloat(investmentChange) || 0,
            notes: notes.trim()
        });
        onClose();
    };

    const handleDelete = () => {
        onDelete(snapshot.id);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Snapshot</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {showDeleteConfirm ? (
                    <div className="modal-form">
                        <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                            Are you sure you want to delete this snapshot? This action cannot be undone.
                        </p>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button type="button" className="btn-danger" onClick={handleDelete}>
                                Delete
                            </button>
                        </div>
                    </div>
                ) : (
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
                                type="number"
                                step="0.01"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Investment Change</label>
                            <input
                                type="number"
                                step="0.01"
                                value={investmentChange}
                                onChange={(e) => setInvestmentChange(e.target.value)}
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
                )}
            </div>
        </div>
    );
}
