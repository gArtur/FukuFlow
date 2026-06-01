import { useState } from 'react';
import type { Asset } from '../../types';
import { cx } from '../../utils';
import styles from './Settings.module.css';

// SVG Icons
const EditIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);

const DeleteIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

interface Category {
    id: string;
    key: string;
    label: string;
    color: string;
    isDefault: boolean;
}

interface CategoriesSettingsProps {
    categories: Category[];
    assets: Asset[];
    addCategory: (label: string, color: string) => Promise<void>;
    updateCategory: (id: string, label: string, color: string) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    onRefreshAssets: () => void;
    onShowDeleteConfirm: (config: {
        title: string;
        message: React.ReactNode;
        isDangerous: boolean;
        onConfirm: () => void;
    }) => void;
}

const COLOR_SWATCHES = [
    '#10b981', // Green
    '#8b5cf6', // Purple
    '#6b7280', // Gray
    '#ec4899', // Pink
    '#f97316', // Orange
    '#3b82f6', // Blue
    '#eab308', // Yellow
];

export default function CategoriesSettings({
    categories,
    assets,
    addCategory,
    updateCategory,
    deleteCategory,
    onRefreshAssets,
    onShowDeleteConfirm,
}: CategoriesSettingsProps) {
    // Local state for category management
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editCategoryLabel, setEditCategoryLabel] = useState('');
    const [editCategoryColor, setEditCategoryColor] = useState('');
    const [addingCategory, setAddingCategory] = useState(false);
    const [addCategoryLabel, setAddCategoryLabel] = useState('');
    const [addCategoryColor, setAddCategoryColor] = useState('#10b981');

    // Handlers
    const handleAddCategory = async () => {
        if (addCategoryLabel.trim()) {
            await addCategory(addCategoryLabel.trim(), addCategoryColor);
            setAddCategoryLabel('');
            setAddCategoryColor('#10b981');
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

    const handleDeleteCategory = (id: string) => {
        const category = categories.find(c => c.id === id);
        if (!category) return;

        const affectedAssets = assets.filter(a => a.category === category.key);
        const usage = affectedAssets.length;
        const name = category.label;

        let message: React.ReactNode = (
            <p>
                Are you sure you want to delete the category "<strong>{name}</strong>"? This action
                cannot be undone.
            </p>
        );

        if (usage > 0) {
            message = (
                <div>
                    <p>
                        Are you sure you want to delete the category "<strong>{name}</strong>"?
                    </p>
                    <div
                        style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}
                    >
                        <p
                            style={{
                                color: 'var(--accent-red)',
                                fontWeight: 500,
                                marginBottom: '8px',
                            }}
                        >
                            Warning: This category is currently used by {usage} investment(s).
                        </p>
                        <p style={{ fontSize: '0.9em', marginBottom: '8px' }}>
                            Deleting this category will <strong>PERMANENTLY DELETE</strong> the
                            following investments and their history:
                        </p>
                        <ul
                            style={{
                                listStyle: 'disc',
                                paddingLeft: '20px',
                                fontSize: '0.9em',
                                maxHeight: '150px',
                                overflowY: 'auto',
                            }}
                        >
                            {affectedAssets.map(a => (
                                <li key={a.id}>{a.name}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            );
        }

        onShowDeleteConfirm({
            title: 'Delete Category?',
            message,
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await deleteCategory(id);
                    onRefreshAssets();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (error: any) {
                    alert(error.message);
                }
            },
        });
    };

    return (
        <section id="categories" className={styles.settingsSection}>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderLeft}>
                    <h2 className={styles.sectionTitle}>Categories</h2>
                    <span className={styles.sectionCount}>{categories.length} categories</span>
                </div>
                <button
                    className="add-asset-btn-inline"
                    onClick={() => setAddingCategory(!addingCategory)}
                    data-testid="add-category-btn"
                >
                    <span>{addingCategory ? '✕' : '+'}</span>{' '}
                    {addingCategory ? 'Cancel' : 'New Category'}
                </button>
            </div>

            {addingCategory && (
                <div className={styles.addPersonCard}>
                    <div className={styles.addPersonHeader}>
                        <h3>New Category</h3>
                    </div>
                    <div className={styles.addPersonFormRow}>
                        <div className={styles.inputGroup} style={{ flex: 2 }}>
                            <label className={styles.inputLabelSm}>NAME</label>
                            <input
                                value={addCategoryLabel}
                                onChange={e => setAddCategoryLabel(e.target.value)}
                                placeholder="e.g. Commodities"
                                className={styles.inputDark}
                                autoFocus
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddCategory();
                                    if (e.key === 'Escape') setAddingCategory(false);
                                }}
                                data-testid="add-category-input"
                            />
                        </div>
                        <div className={styles.inputGroup} style={{ flex: 3 }}>
                            <label className={styles.inputLabelSm}>COLOR</label>
                            <div className={styles.colorSwatchesRow}>
                                {COLOR_SWATCHES.map(color => (
                                    <button
                                        key={color}
                                        className={cx(
                                            styles.colorSwatchBtn,
                                            addCategoryColor === color && styles.selected
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setAddCategoryColor(color)}
                                    >
                                        {addCategoryColor === color && (
                                            <svg
                                                className={styles.swatchCheck}
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                            >
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                    </button>
                                ))}
                                <button
                                    className={styles.colorSwatchAdd}
                                    onClick={() =>
                                        document
                                            .getElementById('add-category-color-picker')
                                            ?.click()
                                    }
                                >
                                    +
                                </button>
                                <input
                                    id="add-category-color-picker"
                                    type="color"
                                    value={addCategoryColor}
                                    onChange={e => setAddCategoryColor(e.target.value)}
                                    className={styles.hiddenColorInput}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAddCategory}
                            className="btn-primary"
                            style={{ flex: 'none' }}
                            data-testid="add-category-submit"
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.settingsItemsGrid}>
                {categories.map(category => (
                    <div
                        key={category.id}
                        className={styles.itemCard}
                        data-testid="category-item"
                        data-category-label={category.label}
                    >
                        {editingCategory === category.id ? (
                            <>
                                <div className={styles.pillWrapper}>
                                    <div
                                        className={cx(styles.categoryPill, styles.editable)}
                                        style={{ backgroundColor: editCategoryColor }}
                                    ></div>
                                    <input
                                        type="color"
                                        value={editCategoryColor}
                                        onChange={e => setEditCategoryColor(e.target.value)}
                                        className={styles.colorInputOverlay}
                                    />
                                </div>
                                <div className={styles.editPersonInline}>
                                    <input
                                        value={editCategoryLabel}
                                        onChange={e => setEditCategoryLabel(e.target.value)}
                                        className={styles.inputDark}
                                        style={{ flex: 1 }}
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleUpdateCategory();
                                            if (e.key === 'Escape') setEditingCategory(null);
                                        }}
                                    />
                                    <div className={styles.editActions}>
                                        <button
                                            onClick={handleUpdateCategory}
                                            className={styles.btnIconCheck}
                                        >
                                            ✓
                                        </button>
                                        <button
                                            onClick={() => setEditingCategory(null)}
                                            className={styles.btnIconCross}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={styles.itemCardLeft}>
                                    <div
                                        className={styles.categoryPill}
                                        style={{ backgroundColor: category.color }}
                                    ></div>
                                </div>
                                <div className={styles.itemCardInfo}>
                                    <span className={styles.itemName}>{category.label}</span>
                                </div>

                                <div className={styles.itemCardActions}>
                                    <button
                                        onClick={() => {
                                            setEditingCategory(category.id);
                                            setEditCategoryLabel(category.label);
                                            setEditCategoryColor(category.color);
                                        }}
                                        className={styles.actionIconBtn}
                                        title="Edit"
                                    >
                                        <EditIcon />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCategory(category.id)}
                                        className={cx(styles.actionIconBtn, styles.delete)}
                                        title="Delete"
                                        data-testid="category-delete-btn"
                                    >
                                        <DeleteIcon />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
