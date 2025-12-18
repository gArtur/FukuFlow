import { useState, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { ApiClient } from '../lib/apiClient';
import type { Person } from '../types';

interface SettingsProps {
    persons: Person[];
    onAddPerson: (name: string) => Promise<void>;
    onUpdatePerson: (id: string, name: string) => Promise<void>;
    onDeletePerson: (id: string) => Promise<void>;
}

export default function Settings({ persons, onAddPerson, onUpdatePerson, onDeletePerson }: SettingsProps) {
    const { currency, setCurrency, categories, addCategory, updateCategory, deleteCategory } = useSettings();
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

    // --- Person Handlers ---
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

    // --- Category Handlers ---
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

    // --- Backup/Restore Handlers ---
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

    const [activeTab, setActiveTab] = useState<'general' | 'people' | 'categories' | 'data'>('general');

    // ... (Keep existing state and handlers) ...
    // Note: I will need to provide the full file content to ensure state retention if using replace_file_content effectively or I should have used multi_replace or full rewrite.
    // Given the complexity of moving JSX around significantly, I will Rewrite the Render Return primarily.

    return (
        <div className="settings-container">
            {/* Sidebar */}
            <nav className="settings-sidebar">
                <div
                    className={`settings-nav-item ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    <span className="settings-nav-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    </span>
                    <span>General</span>
                </div>
                <div
                    className={`settings-nav-item ${activeTab === 'people' ? 'active' : ''}`}
                    onClick={() => setActiveTab('people')}
                >
                    <span className="settings-nav-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </span>
                    <span>People</span>
                </div>
                <div
                    className={`settings-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                >
                    <span className="settings-nav-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                    </span>
                    <span>Categories</span>
                </div>
                <div
                    className={`settings-nav-item ${activeTab === 'data' ? 'active' : ''}`}
                    onClick={() => setActiveTab('data')}
                >
                    <span className="settings-nav-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </span>
                    <span>Data & Security</span>
                </div>
            </nav>

            {/* Content Area */}
            <div className="settings-content-area fade-in">
                {activeTab === 'general' && (
                    <div className="settings-section">
                        <h2>Currency</h2>
                        <div className="settings-card">
                            <div className="currency-grid">
                                {[
                                    { code: 'USD', symbol: '$' },
                                    { code: 'PLN', symbol: 'zł' },
                                    { code: 'EUR', symbol: '€' },
                                    { code: 'GBP', symbol: '£' },
                                    { code: 'JPY', symbol: '¥' },
                                    { code: 'CHF', symbol: 'Fr' },
                                    { code: 'CAD', symbol: '$' },
                                    { code: 'AUD', symbol: '$' }
                                ].map(opt => (
                                    <div
                                        key={opt.code}
                                        className={`currency-option ${currency === opt.code ? 'active' : ''}`}
                                        onClick={() => setCurrency(opt.code)}
                                    >
                                        <span className="currency-code">{opt.code}</span>
                                        <span className="currency-symbol">{opt.symbol}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'people' && (
                    <div className="settings-section">
                        <h2>People</h2>
                        <div className="settings-card">
                            <div className="settings-list">
                                {persons.map(person => (
                                    <div key={person.id} className="list-item">
                                        {editingPerson === person.id ? (
                                            <div className="edit-row">
                                                <input
                                                    value={editPersonValue}
                                                    onChange={e => setEditPersonValue(e.target.value)}
                                                    className="form-input"
                                                    autoFocus
                                                />
                                                <button onClick={handleUpdatePerson} className="btn-icon" title="Save">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                                </button>
                                                <button onClick={() => setEditingPerson(null)} className="btn-icon" title="Cancel">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="person-info">
                                                    <span className="person-name">{person.name}</span>
                                                </div>
                                                <div className="actions">
                                                    <button onClick={() => { setEditingPerson(person.id); setEditPersonValue(person.name); }} className="btn-icon" title="Edit">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                    </button>
                                                    <button onClick={() => onDeletePerson(person.id)} className="btn-icon delete" title="Delete">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {addingPerson ? (
                                <div className="add-input-row">
                                    <input
                                        value={addPersonValue}
                                        onChange={e => setAddPersonValue(e.target.value)}
                                        placeholder="Name..."
                                        className="form-input"
                                        style={{ flex: 1 }}
                                        autoFocus
                                    />
                                    <button onClick={handleAddPerson} className="btn-primary-sm">Add</button>
                                    <button onClick={() => setAddingPerson(false)} className="btn-secondary-sm">Cancel</button>
                                </div>
                            ) : (
                                <button onClick={() => setAddingPerson(true)} className="btn-add-row">
                                    + Add Person
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="settings-section">
                        <h2>Asset Categories</h2>
                        <div className="settings-card">
                            <div className="settings-list">
                                {categories.map(category => (
                                    <div key={category.id} className="list-item">
                                        {editingCategory === category.id ? (
                                            <div className="edit-row">
                                                <input
                                                    value={editCategoryLabel}
                                                    onChange={e => setEditCategoryLabel(e.target.value)}
                                                    className="form-input"
                                                    style={{ flex: 1 }}
                                                />
                                                <input
                                                    type="color"
                                                    value={editCategoryColor}
                                                    onChange={e => setEditCategoryColor(e.target.value)}
                                                    className="color-picker-input"
                                                />
                                                <button onClick={handleUpdateCategory} className="btn-icon" title="Save">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                                </button>
                                                <button onClick={() => setEditingCategory(null)} className="btn-icon" title="Cancel">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="category-item-content">
                                                    <div className="color-preview" style={{ backgroundColor: category.color }}></div>
                                                    <span className="category-label">{category.label}</span>
                                                </div>
                                                <div className="actions">
                                                    <button onClick={() => {
                                                        setEditingCategory(category.id);
                                                        setEditCategoryLabel(category.label);
                                                        setEditCategoryColor(category.color);
                                                    }} className="btn-icon" title="Edit">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                    </button>
                                                    <button onClick={() => handleDeleteCategory(category.id)} className="btn-icon delete" title="Delete">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {addingCategory ? (
                                <div className="add-input-row">
                                    <input
                                        value={addCategoryLabel}
                                        onChange={e => setAddCategoryLabel(e.target.value)}
                                        placeholder="Category Name"
                                        className="form-input"
                                        style={{ flex: 1 }}
                                    />
                                    <input
                                        type="color"
                                        value={addCategoryColor}
                                        onChange={e => setAddCategoryColor(e.target.value)}
                                        className="color-picker-input"
                                    />
                                    <button onClick={handleAddCategory} className="btn-primary-sm">Add</button>
                                    <button onClick={() => setAddingCategory(false)} className="btn-secondary-sm">Cancel</button>
                                </div>
                            ) : (
                                <button onClick={() => setAddingCategory(true)} className="btn-add-row">
                                    + Add Category
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="settings-section">
                        <h2>Data & Security</h2>
                        <div className="settings-card">
                            <div className="data-card-grid">
                                <div className="data-card" onClick={handleBackup}>
                                    <div className="data-card-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    </div>
                                    <div>
                                        <h3>Backup Data</h3>
                                        <p>Download a secure JSON file of your entire portfolio.</p>
                                    </div>
                                </div>
                                <div className="data-card" onClick={handleRestoreClick}>
                                    <div className="data-card-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    </div>
                                    <div>
                                        <h3>Restore Data</h3>
                                        <p>{restoring ? 'Restoring in progress...' : 'Upload a backup file to restore your portfolio.'}</p>
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
                )}
            </div>
        </div>
    );
}
