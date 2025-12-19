import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { ApiClient } from '../lib/apiClient';
import type { Person } from '../types';
import '../settings_styles.css';

interface SettingsProps {
    persons: Person[];
    onAddPerson: (name: string) => Promise<void>;
    onUpdatePerson: (id: string, name: string) => Promise<void>;
    onDeletePerson: (id: string) => Promise<void>;
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

export default function Settings({ persons, onAddPerson, onUpdatePerson, onDeletePerson }: SettingsProps) {
    const { currency, setCurrency, defaultFilter, setDefaultFilter, defaultDateRange, setDefaultDateRange, categories, addCategory, updateCategory, deleteCategory } = useSettings();
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    const [restoring, setRestoring] = useState(false);

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
            await onUpdatePerson(editingPerson, editPersonValue.trim());
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

    const handleDeleteCategory = async (id: string) => {
        if (confirm('Are you sure you want to delete this category? This will fail if any assets are using it.')) {
            try {
                await deleteCategory(id);
            } catch (error: any) {
                alert(error.message);
            }
        }
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
        if (confirm('WARNING: Restoring a backup will REPLACE ALL CURRENT DATA. This action cannot be undone. Are you sure?')) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                setRestoring(true);
                await ApiClient.restoreBackup(json);
                alert('Restore successful! The page will now reload.');
                window.location.reload();
            } catch (error) {
                console.error('Restore failed:', error);
                alert('Restore failed. Please check the console for details.');
            } finally {
                setRestoring(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
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
                                    <div key={person.id} className="item-card">
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
                                                <div className="item-card-left">
                                                    <div className="person-avatar">
                                                        {person.name.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="item-card-info">
                                                    <span className="item-name">{person.name}</span>
                                                </div>

                                                <div className="item-card-actions">
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
                                                        onClick={() => onDeletePerson(person.id)}
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
                                        <button onClick={handleBackup} className="btn-primary-gold-block">
                                            Backup Data
                                            <span className="icon-right">↓</span>
                                        </button>
                                    </div>

                                    <div className="data-block">
                                        <div className="data-block-info">
                                            <h3>Restore Data</h3>
                                            <p>Overwrite current data with a backup file.</p>
                                        </div>
                                        <button onClick={handleRestoreClick} className="btn-primary-gold-block">
                                            {restoring ? 'Restoring...' : 'Restore Data'}
                                            <span className="icon-right">↑</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".json"
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
