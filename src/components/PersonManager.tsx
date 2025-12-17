import { useState } from 'react';
import type { FamilyMember } from '../types';
import { OWNER_LABELS } from '../types';

interface PersonManagerProps {
    isOpen: boolean;
    onClose: () => void;
    persons: Record<Exclude<FamilyMember, 'all'>, string>;
    onUpdatePerson: (key: Exclude<FamilyMember, 'all'>, name: string) => void;
}

export default function PersonManager({ isOpen, onClose, persons, onUpdatePerson }: PersonManagerProps) {
    const [editing, setEditing] = useState<Exclude<FamilyMember, 'all'> | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleEdit = (key: Exclude<FamilyMember, 'all'>) => {
        setEditing(key);
        setEditValue(persons[key]);
    };

    const handleSave = () => {
        if (editing && editValue.trim()) {
            onUpdatePerson(editing, editValue.trim());
        }
        setEditing(null);
        setEditValue('');
    };

    const handleCancel = () => {
        setEditing(null);
        setEditValue('');
    };

    if (!isOpen) return null;

    const personKeys: Exclude<FamilyMember, 'all'>[] = ['self', 'wife', 'daughter'];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal person-manager-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Manage Persons</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <p className="person-manager-desc">
                        Customize the names displayed for each family member.
                    </p>
                    <div className="person-list">
                        {personKeys.map(key => (
                            <div key={key} className="person-item">
                                <div className="person-item-icon">
                                    {persons[key].charAt(0).toUpperCase()}
                                </div>
                                <div className="person-item-content">
                                    {editing === key ? (
                                        <div className="person-edit-row">
                                            <input
                                                type="text"
                                                className="form-input person-edit-input"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSave();
                                                    if (e.key === 'Escape') handleCancel();
                                                }}
                                            />
                                            <button className="person-save-btn" onClick={handleSave}>Save</button>
                                            <button className="person-cancel-btn" onClick={handleCancel}>×</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="person-item-name">{persons[key]}</div>
                                            <div className="person-item-key">{OWNER_LABELS[key]} (default)</div>
                                        </>
                                    )}
                                </div>
                                {editing !== key && (
                                    <button className="person-edit-btn" onClick={() => handleEdit(key)}>
                                        Edit
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
