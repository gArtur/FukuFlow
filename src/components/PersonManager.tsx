import { useState } from 'react';
import type { Person } from '../types';

interface PersonManagerProps {
    isOpen: boolean;
    onClose: () => void;
    persons: Person[];
    onAddPerson: (name: string) => void;
    onUpdatePerson: (id: string, name: string) => void;
    onDeletePerson: (id: string) => void;
}

export default function PersonManager({
    isOpen,
    onClose,
    persons,
    onAddPerson,
    onUpdatePerson,
    onDeletePerson
}: PersonManagerProps) {
    const [editing, setEditing] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [adding, setAdding] = useState(false);
    const [addValue, setAddValue] = useState('');

    const handleEdit = (person: Person) => {
        setEditing(person.id);
        setEditValue(person.name);
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

    const handleAdd = () => {
        if (addValue.trim()) {
            onAddPerson(addValue.trim());
            setAddValue('');
            setAdding(false);
        }
    };

    const handleCancelAdd = () => {
        setAddValue('');
        setAdding(false);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal person-manager-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Manage Persons</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <p className="person-manager-desc">
                        Add, edit, or remove family members. Filter buttons will update automatically.
                    </p>

                    <div className="person-list">
                        {persons.map(person => (
                            <div key={person.id} className="person-item">
                                <div className="person-item-icon">
                                    {person.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="person-item-content">
                                    {editing === person.id ? (
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
                                        <div className="person-item-name">{person.name}</div>
                                    )}
                                </div>
                                {editing !== person.id && (
                                    <div className="person-item-actions">
                                        <button className="person-edit-btn" onClick={() => handleEdit(person)}>
                                            Edit
                                        </button>
                                        <button
                                            className="person-delete-btn"
                                            onClick={() => onDeletePerson(person.id)}
                                            disabled={persons.length === 1}
                                            title={persons.length === 1 ? 'Cannot delete the last person' : 'Delete person'}
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {adding ? (
                            <div className="person-item person-item-add">
                                <div className="person-item-icon">+</div>
                                <div className="person-item-content">
                                    <div className="person-edit-row">
                                        <input
                                            type="text"
                                            className="form-input person-edit-input"
                                            value={addValue}
                                            onChange={e => setAddValue(e.target.value)}
                                            placeholder="Enter name..."
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleAdd();
                                                if (e.key === 'Escape') handleCancelAdd();
                                            }}
                                        />
                                        <button className="person-save-btn" onClick={handleAdd}>Add</button>
                                        <button className="person-cancel-btn" onClick={handleCancelAdd}>×</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button className="person-add-btn" onClick={() => setAdding(true)}>
                                <span className="person-add-icon">+</span>
                                <span>Add Person</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
