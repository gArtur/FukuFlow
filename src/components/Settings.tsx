import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { ApiClient } from '../lib/apiClient';
import type { Person, Asset } from '../types';
import '../settings_styles.css';
import ConfirmationModal from './ConfirmationModal';
import RestoreDataModal from './RestoreDataModal';

interface SettingsProps {
    persons: Person[];
    onAddPerson: (name: string) => Promise<void>;
    onUpdatePerson: (id: string, data: { name?: string, displayOrder?: number }) => Promise<void>;
    onReorderPersons: (ids: string[]) => Promise<void>;
    onDeletePerson: (id: string) => Promise<void>;
    assets: Asset[];
    onRefreshAssets: () => void;
}

// Custom Select Component for matching the design
const CustomSelect = ({ label, value, options, onChange }: { label: string, value: string, options: { value: string, label: string }[], onChange: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <div className="custom-select-container" ref={containerRef}>
            <label className="settings-label">{label}</label>
            <div className={`custom-select-trigger ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                <span>{selectedOption?.label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`select-arrow ${isOpen ? 'rotated' : ''}`}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            {isOpen && (
                <div className="custom-select-options">
                    {options.map(opt => (
                        <div
                            key={opt.value}
                            className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            {opt.label}
                            {opt.value === value && <span className="check-icon">✓</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function Settings({ persons, onAddPerson, onUpdatePerson, onReorderPersons, onDeletePerson, assets, onRefreshAssets }: SettingsProps) {
    const { currency, setCurrency, defaultFilter, setDefaultFilter, defaultDateRange, setDefaultDateRange, categories, addCategory, updateCategory, deleteCategory } = useSettings();
    // Person Management State
    const [editingPerson, setEditingPerson] = useState<string | null>(null);
    const [editPersonValue, setEditPersonValue] = useState('');
    const [addingPerson, setAddingPerson] = useState(false);
    const [addPersonValue, setAddPersonValue] = useState('');

    // Category Management State
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editCategoryLabel, setEditCategoryLabel] = useState('');
    const [editCategoryColor, setEditCategoryColor] = useState('');
    const [addingCategory, setAddingCategory] = useState(false);
    const [addCategoryLabel, setAddCategoryLabel] = useState('');
    const [addCategoryColor, setAddCategoryColor] = useState('#000000');

    // Backup/Restore State
    const [showRestoreModal, setShowRestoreModal] = useState(false);

    // Options
    const currencyOptions = [
        { value: 'USD', label: 'USD ($)' },
        { value: 'PLN', label: 'PLN (zł)' },
        { value: 'EUR', label: 'EUR (€)' },
        { value: 'GBP', label: 'GBP (£)' },
        { value: 'JPY', label: 'JPY (¥)' },
        { value: 'CHF', label: 'CHF (Fr)' },
        { value: 'CAD', label: 'CAD ($)' },
        { value: 'AUD', label: 'AUD ($)' }
    ];

    const filterOptions = [
        { value: 'all', label: 'All' },
        ...persons.map(p => ({ value: p.id, label: p.name }))
    ];

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

    const handleAddCategory = async () => {
        if (addCategoryLabel.trim()) {
            await addCategory(addCategoryLabel.trim(), addCategoryColor);
            setAddCategoryLabel('');
            setAddCategoryColor('#000000');
            setAddingCategory(false);
        }
    };

    const handleUpdateCategory = async () => {
        if (editingCategory && editCategoryLabel.trim()) {
            await updateCategory(editingCategory, editCategoryLabel.trim(), editCategoryColor);
            setEditingCategory(null);
            setEditCategoryLabel('');
            setEditCategoryColor('');
        }
    };

    // Confirmation Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => void;
        isDangerous: boolean;
    }>({
        isOpen: false,
        title: '',
        message: null,
        onConfirm: () => { },
        isDangerous: false
    });

    const handleDeleteCategory = (id: string) => {
        const category = categories.find(c => c.id === id);
        if (!category) return;

        const affectedAssets = assets.filter(a => a.category === category.key);
        const usage = affectedAssets.length;
        const name = category.label;

        let message: React.ReactNode = <p>Are you sure you want to delete the category "<strong>{name}</strong>"? This action cannot be undone.</p>;

        if (usage > 0) {
            message = (
                <div>
                    <p>Are you sure you want to delete the category "<strong>{name}</strong>"?</p>
                    <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <p style={{ color: 'var(--accent-red)', fontWeight: 500, marginBottom: '8px' }}>
                            Warning: This category is currently used by {usage} investment(s).
                        </p>
                        <p style={{ fontSize: '0.9em', marginBottom: '8px' }}>
                            Deleting this category will <strong>PERMANENTLY DELETE</strong> the following investments and their history:
                        </p>
                        <ul style={{ listStyle: 'disc', paddingLeft: '20px', fontSize: '0.9em', maxHeight: '150px', overflowY: 'auto' }}>
                            {affectedAssets.map(a => (
                                <li key={a.id}>{a.name}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            );
        }

        setConfirmConfig({
            isOpen: true,
            title: 'Delete Category?',
            message,
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await deleteCategory(id);
                    onRefreshAssets();
                } catch (error: any) {
                    alert(error.message);
                }
            }
        });
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

        setConfirmConfig({
            isOpen: true,
            title: 'Delete Person?',
            message,
            isDangerous: true,
            onConfirm: async () => {
                await onDeletePerson(id);
                onRefreshAssets();
            }
        });
    };

    const handleBackup = async () => {
        try {
            const blob = await ApiClient.getBackup();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wealth-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Backup failed:', error);
            alert('Backup failed');
        }
    };

    const handleRestoreClick = () => {
        setShowRestoreModal(true);
    };
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Drag and Drop state
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

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

        if (onReorderPersons) {
            await onReorderPersons(newOrderIds);
        }
        setDraggedId(null);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverId(null);
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-card settings-card-override">
                <div className="dashboard-card-header">
                    <h2>Settings</h2>
                </div>

                <div className="dashboard-card-content settings-layout-wrapper">
                    <div className="settings-layout">
                        {/* Sidebar */}
                        <nav className="settings-sidebar">
                            <button
                                className="settings-tab"
                                onClick={() => scrollToSection('general')}
                            >
                                General
                            </button>
                            <button
                                className="settings-tab"
                                onClick={() => scrollToSection('people')}
                            >
                                People
                            </button>
                            <button
                                className="settings-tab"
                                onClick={() => scrollToSection('categories')}
                            >
                                Categories
                            </button>
                            <button
                                className="settings-tab"
                                onClick={() => scrollToSection('data')}
                            >
                                Backup
                            </button>
                        </nav>

                        {/* Content */}
                        <div className="settings-content">
                            {/* General Section */}
                            <div id="general" className="movers-header" style={{ marginTop: 0 }}>
                                <div className="movers-header-left">
                                    <h2 className="movers-title">General</h2>
                                </div>
                            </div>
                            <div className="settings-group-card">
                                <div className="settings-row">
                                    <div className="settings-group">
                                        <CustomSelect
                                            label="Currency Selection"
                                            value={currency || 'USD'}
                                            options={currencyOptions}
                                            onChange={setCurrency}
                                        />
                                    </div>
                                    <div className="settings-group">
                                        <CustomSelect
                                            label="Default Diagram Filter"
                                            value={defaultFilter || 'all'}
                                            options={filterOptions}
                                            onChange={setDefaultFilter}
                                        />
                                    </div>
                                    <div className="settings-group">
                                        <label className="settings-label">Default Date Range</label>
                                        <div className="date-range-pills">
                                            {(['YTD', '1Y', '5Y', 'MAX'] as const).map(range => (
                                                <button
                                                    key={range}
                                                    className={`date-pill ${defaultDateRange === range ? 'active' : ''}`}
                                                    onClick={() => setDefaultDateRange(range)}
                                                >
                                                    {range}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="section-divider"></div>

                            {/* People Section */}
                            <div id="people" className="movers-header">
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
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="9" cy="5" r="1"></circle>
                                                        <circle cx="9" cy="12" r="1"></circle>
                                                        <circle cx="9" cy="19" r="1"></circle>
                                                        <circle cx="15" cy="5" r="1"></circle>
                                                        <circle cx="15" cy="12" r="1"></circle>
                                                        <circle cx="15" cy="19" r="1"></circle>
                                                    </svg>
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
                                                            onClick={() => { setEditingPerson(person.id); setEditPersonValue(person.name); }}
                                                            className="action-icon-btn"
                                                            title="Edit"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePersonClick(person.id)}
                                                            className="action-icon-btn delete"
                                                            title="Delete"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="section-divider"></div>

                            {/* Categories Section */}
                            <div id="categories" className="movers-header">
                                <div className="movers-header-left">
                                    <h2 className="movers-title">Categories</h2>
                                    <span className="movers-count">{categories.length} categories</span>
                                </div>
                                <button
                                    className="add-asset-btn-inline"
                                    onClick={() => setAddingCategory(!addingCategory)}
                                >
                                    <span>{addingCategory ? '✕' : '+'}</span> {addingCategory ? 'Cancel' : 'New Category'}
                                </button>
                            </div>

                            {addingCategory && (
                                <div className="add-person-card">
                                    <div className="add-person-header">
                                        <h3>New Category</h3>
                                    </div>
                                    <div className="add-person-form-row">
                                        <div className="input-group" style={{ flex: 2 }}>
                                            <label className="input-label-sm">NAME</label>
                                            <input
                                                value={addCategoryLabel}
                                                onChange={e => setAddCategoryLabel(e.target.value)}
                                                placeholder="e.g. Commodities"
                                                className="input-dark"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="input-group" style={{ flex: 3 }}>
                                            <label className="input-label-sm">COLOR</label>
                                            <div className="color-swatches-row">
                                                {[
                                                    '#10b981', // Green
                                                    '#8b5cf6', // Purple
                                                    '#6b7280', // Gray
                                                    '#ec4899', // Pink
                                                    '#f97316', // Orange
                                                    '#3b82f6', // Blue
                                                    '#eab308', // Yellow
                                                ].map(color => (
                                                    <button
                                                        key={color}
                                                        className={`color-swatch-btn ${addCategoryColor === color ? 'selected' : ''}`}
                                                        style={{ backgroundColor: color }}
                                                        onClick={() => setAddCategoryColor(color)}
                                                    >
                                                        {addCategoryColor === color && (
                                                            <svg className="swatch-check" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                <polyline points="20 6 9 17 4 12"></polyline>
                                                            </svg>
                                                        )}
                                                    </button>
                                                ))}
                                                <button className="color-swatch-add" onClick={() => document.getElementById('custom-color-picker')?.click()}>
                                                    +
                                                </button>
                                                <input
                                                    id="custom-color-picker"
                                                    type="color"
                                                    value={addCategoryColor}
                                                    onChange={e => setAddCategoryColor(e.target.value)}
                                                    className="hidden-color-input"
                                                />
                                            </div>
                                        </div>
                                        <button onClick={handleAddCategory} className="btn-add-purple">
                                            Add
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="settings-items-grid">
                                {categories.map(category => (
                                    <div key={category.id} className="item-card">
                                        {editingCategory === category.id ? (
                                            <>
                                                <div className="pill-wrapper">
                                                    <div
                                                        className="category-pill editable"
                                                        style={{ backgroundColor: editCategoryColor }}
                                                    ></div>
                                                    <input
                                                        type="color"
                                                        value={editCategoryColor}
                                                        onChange={e => setEditCategoryColor(e.target.value)}
                                                        className="color-input-overlay"
                                                    />
                                                </div>
                                                <div className="edit-person-inline">
                                                    <input
                                                        value={editCategoryLabel}
                                                        onChange={e => setEditCategoryLabel(e.target.value)}
                                                        className="input-dark"
                                                        style={{ flex: 1 }}
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleUpdateCategory();
                                                            if (e.key === 'Escape') setEditingCategory(null);
                                                        }}
                                                    />
                                                    <div className="edit-actions">
                                                        <button onClick={handleUpdateCategory} className="btn-icon-check">✓</button>
                                                        <button onClick={() => setEditingCategory(null)} className="btn-icon-cross">✕</button>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="item-card-left">
                                                    <div className="category-pill" style={{ backgroundColor: category.color }}></div>
                                                </div>
                                                <div className="item-card-info">
                                                    <span className="item-name">{category.label}</span>
                                                </div>

                                                <div className="item-card-actions">
                                                    <button
                                                        onClick={() => {
                                                            setEditingCategory(category.id);
                                                            setEditCategoryLabel(category.label);
                                                            setEditCategoryColor(category.color);
                                                        }}
                                                        className="action-icon-btn"
                                                        title="Edit"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(category.id)}
                                                        className="action-icon-btn delete"
                                                        title="Delete"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="section-divider"></div>

                            {/* Backup Section */}
                            <div id="data" className="movers-header">
                                <div className="movers-header-left">
                                    <h2 className="movers-title">Backup</h2>
                                </div>
                            </div>
                            <div className="settings-group-card">
                                <div className="data-row">
                                    <div className="data-block">
                                        <div className="data-block-info">
                                            <h3>Backup Data</h3>
                                            <p>Download a JSON file of your portfolio.</p>
                                        </div>
                                        <button onClick={handleBackup} className="btn-data-action">
                                            Backup Data
                                            <span className="icon-right">↓</span>
                                        </button>
                                    </div>

                                    <div className="data-block">
                                        <div className="data-block-info">
                                            <h3>Restore Data</h3>
                                            <p>Overwrite current data with a backup file.</p>
                                        </div>
                                        <button onClick={handleRestoreClick} className="btn-data-action">
                                            Restore Data
                                            <span className="icon-right">↑</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals */}
                <ConfirmationModal
                    isOpen={confirmConfig.isOpen}
                    onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    confirmLabel="Delete"
                    isDangerous={confirmConfig.isDangerous}
                    onConfirm={confirmConfig.onConfirm}
                />

                <RestoreDataModal
                    isOpen={showRestoreModal}
                    onClose={() => setShowRestoreModal(false)}
                />
            </div>
        </div>
    );
}
