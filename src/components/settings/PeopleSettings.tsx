import { useState } from 'react';
import type { Person, Asset } from '../../types';

// SVG Icons as components for cleaner JSX
const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);

const DeleteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

const DragIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="5" r="1"></circle>
        <circle cx="9" cy="12" r="1"></circle>
        <circle cx="9" cy="19" r="1"></circle>
        <circle cx="15" cy="5" r="1"></circle>
        <circle cx="15" cy="12" r="1"></circle>
        <circle cx="15" cy="19" r="1"></circle>
    </svg>
);

interface PeopleSettingsProps {
    persons: Person[];
    assets: Asset[];
    onAddPerson: (name: string) => Promise<unknown>;
    onUpdatePerson: (id: string, data: { name?: string; displayOrder?: number }) => Promise<unknown>;
    onReorderPersons: (ids: string[]) => Promise<unknown>;
    onDeletePerson: (id: string) => Promise<unknown>;
    onRefreshAssets: () => void;
    onShowDeleteConfirm: (config: {
        title: string;
        message: React.ReactNode;
        isDangerous: boolean;
        onConfirm: () => void;
    }) => void;
}

export default function PeopleSettings({
    persons,
    assets,
    onAddPerson,
    onUpdatePerson,
    onReorderPersons,
    onDeletePerson,
    onRefreshAssets,
    onShowDeleteConfirm
}: PeopleSettingsProps) {
    // Local state for person management
    const [editingPerson, setEditingPerson] = useState<string | null>(null);
    const [editPersonValue, setEditPersonValue] = useState('');
    const [addingPerson, setAddingPerson] = useState(false);
    const [addPersonValue, setAddPersonValue] = useState('');

    // Drag and Drop state
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    // Handlers
    const handleAddPerson = async () => {
        if (addPersonValue.trim()) {
            await onAddPerson(addPersonValue.trim());
            setAddPersonValue('');
            setAddingPerson(false);
        }
    };

    const handleUpdatePerson = async () => {
        if (editingPerson && editPersonValue.trim()) {
            await onUpdatePerson(editingPerson, { name: editPersonValue.trim() });
            setEditingPerson(null);
            setEditPersonValue('');
        }
    };

    const handleDeletePersonClick = (id: string) => {
        const person = persons.find(p => p.id === id);
        if (!person) return;

        const personAssets = assets.filter(a => a.ownerId === id);
        const personAssetsCount = personAssets.length;

        let message: React.ReactNode = <p>Are you sure you want to delete "<strong>{person.name}</strong>"?</p>;

        if (personAssetsCount > 0) {
            message = (
                <div>
                    <p>Are you sure you want to delete "<strong>{person.name}</strong>"?</p>
                    <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <p style={{ color: 'var(--accent-red)', fontWeight: 500, marginBottom: '8px' }}>
                            Warning: "{person.name}" has {personAssetsCount} investment(s).
                        </p>
                        <p style={{ fontSize: '0.9em', marginBottom: '8px' }}>
                            Deleting this person will <strong>PERMANENTLY DELETE</strong> the following investments and their history:
                        </p>
                        <ul style={{ listStyle: 'disc', paddingLeft: '20px', fontSize: '0.9em', maxHeight: '150px', overflowY: 'auto' }}>
                            {personAssets.map(a => (
                                <li key={a.id}>{a.name}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            );
        }

        onShowDeleteConfirm({
            title: 'Delete Person?',
            message,
            isDangerous: true,
            onConfirm: async () => {
                await onDeletePerson(id);
                onRefreshAssets();
            }
        });
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverId !== id) {
            setDragOverId(id);
        }
    };

    const handleDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        setDragOverId(null);
        if (!draggedId || draggedId === targetId) return;

        const draggedIndex = persons.findIndex(p => p.id === draggedId);
        const targetIndex = persons.findIndex(p => p.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const newPersons = [...persons];
        const [movedPerson] = newPersons.splice(draggedIndex, 1);
        newPersons.splice(targetIndex, 0, movedPerson);

        const newOrderIds = newPersons.map(p => p.id);
        await onReorderPersons(newOrderIds);
        setDraggedId(null);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverId(null);
    };

    return (
        <section id="people" className="settings-section">
            <div className="movers-header">
                <div className="movers-header-left">
                    <h2 className="movers-title">People</h2>
                    <span className="movers-count">{persons.length} people</span>
                </div>
                <button
                    className="add-asset-btn-inline"
                    onClick={() => setAddingPerson(!addingPerson)}
                >
                    <span>{addingPerson ? '✕' : '+'}</span> {addingPerson ? 'Cancel' : 'Add Person'}
                </button>
            </div>

            {addingPerson && (
                <div className="add-person-card">
                    <div className="add-person-header">
                        <h3>Add Person</h3>
                    </div>
                    <div className="add-person-form-row">
                        <div className="input-group">
                            <label className="input-label-sm">NAME</label>
                            <input
                                value={addPersonValue}
                                onChange={e => setAddPersonValue(e.target.value)}
                                placeholder="e.g. John Doe"
                                className="input-dark"
                                autoFocus
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddPerson();
                                    if (e.key === 'Escape') setAddingPerson(false);
                                }}
                            />
                        </div>
                        <button onClick={handleAddPerson} className="btn-add-purple">
                            Add
                        </button>
                    </div>
                </div>
            )}

            <div className="settings-items-grid">
                {persons.map(person => (
                    <div
                        key={person.id}
                        className={`item-card ${draggedId === person.id ? 'dragging' : ''} ${dragOverId === person.id ? 'drag-over' : ''}`}
                        draggable={editingPerson === null}
                        onDragStart={(e) => handleDragStart(e, person.id)}
                        onDragOver={(e) => handleDragOver(e, person.id)}
                        onDrop={(e) => handleDrop(e, person.id)}
                        onDragEnd={handleDragEnd}
                    >
                        {editingPerson === person.id ? (
                            <div className="edit-person-inline">
                                <input
                                    value={editPersonValue}
                                    onChange={e => setEditPersonValue(e.target.value)}
                                    className="input-dark"
                                    style={{ flex: 1 }}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdatePerson();
                                        if (e.key === 'Escape') setEditingPerson(null);
                                    }}
                                />
                                <div className="edit-actions">
                                    <button onClick={handleUpdatePerson} className="btn-icon-check">✓</button>
                                    <button onClick={() => setEditingPerson(null)} className="btn-icon-cross">✕</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="drag-handle" title="Drag to reorder">
                                    <DragIcon />
                                </div>
                                <div className="item-card-left">
                                    <div className="person-avatar">
                                        {person.name.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className="item-card-info">
                                    <span className="item-name">{person.name}</span>
                                </div>

                                <div className="item-card-actions">
                                    <div className="action-buttons-row">
                                        <button
                                            onClick={() => {
                                                setEditingPerson(person.id);
                                                setEditPersonValue(person.name);
                                            }}
                                            className="action-icon-btn"
                                            title="Edit"
                                        >
                                            <EditIcon />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePersonClick(person.id)}
                                            className="action-icon-btn delete"
                                            title="Delete"
                                        >
                                            <DeleteIcon />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
