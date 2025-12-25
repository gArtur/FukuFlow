import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import type { Person, Asset } from '../types';
import '../settings_styles.css';
import ConfirmationModal from './ConfirmationModal';
import RestoreDataModal from './RestoreDataModal';
import {
    GeneralSettings,
    PeopleSettings,
    CategoriesSettings,
    BackupSettings,
    SecuritySettings
} from './settings/index';

interface SettingsProps {
    persons: Person[];
    onAddPerson: (name: string) => Promise<unknown>;
    onUpdatePerson: (id: string, data: { name?: string, displayOrder?: number }) => Promise<unknown>;
    onReorderPersons: (ids: string[]) => Promise<unknown>;
    onDeletePerson: (id: string) => Promise<unknown>;
    assets: Asset[];
    onRefreshAssets: () => void;
}

interface ConfirmConfig {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    isDangerous: boolean;
}

export default function Settings({
    persons,
    onAddPerson,
    onUpdatePerson,
    onReorderPersons,
    onDeletePerson,
    assets,
    onRefreshAssets
}: SettingsProps) {
    const {
        currency,
        setCurrency,
        theme,
        setTheme,
        defaultFilter,
        setDefaultFilter,
        defaultDateRange,
        setDefaultDateRange,
        categories,
        addCategory,
        updateCategory,
        deleteCategory
    } = useSettings();

    // Confirmation Modal State
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
        isOpen: false,
        title: '',
        message: null,
        onConfirm: () => { },
        isDangerous: false
    });

    // Restore Modal State
    const [showRestoreModal, setShowRestoreModal] = useState(false);

    // Active Section State
    const [activeSection, setActiveSection] = useState<string>('general');

    // Scroll Spy Effect
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            {
                root: null,
                rootMargin: '-20% 0px -60% 0px', // Trigger when section is near top
                threshold: 0
            }
        );

        const sections = document.querySelectorAll('.settings-section');
        sections.forEach((section) => observer.observe(section));

        return () => {
            sections.forEach((section) => observer.unobserve(section));
        };
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            // Offset for sticky header if needed, though scrollIntoView usually handles it
            const y = element.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
            setActiveSection(id);
        }
    };

    const handleShowDeleteConfirm = (config: {
        title: string;
        message: React.ReactNode;
        isDangerous: boolean;
        onConfirm: () => void;
    }) => {
        setConfirmConfig({
            isOpen: true,
            ...config
        });
    };

    return (
        <div className="dashboard-container">
            <div className="settings-layout">
                {/* Sidebar Navigation */}
                <nav className="settings-sidebar">
                    <button
                        className={`settings-tab ${activeSection === 'general' ? 'active' : ''}`}
                        onClick={() => scrollToSection('general')}
                    >
                        General
                    </button>
                    <button
                        className={`settings-tab ${activeSection === 'people' ? 'active' : ''}`}
                        onClick={() => scrollToSection('people')}
                    >
                        People
                    </button>
                    <button
                        className={`settings-tab ${activeSection === 'categories' ? 'active' : ''}`}
                        onClick={() => scrollToSection('categories')}
                    >
                        Categories
                    </button>
                    <button
                        className={`settings-tab ${activeSection === 'backup' ? 'active' : ''}`}
                        onClick={() => scrollToSection('backup')}
                    >
                        Backup
                    </button>
                    <button
                        className={`settings-tab ${activeSection === 'security' ? 'active' : ''}`}
                        onClick={() => scrollToSection('security')}
                    >
                        Security
                    </button>
                </nav>

                {/* Content Area */}
                <div className="settings-content">
                    <GeneralSettings
                        currency={currency}
                        setCurrency={setCurrency}
                        theme={theme}
                        setTheme={setTheme}
                        defaultFilter={defaultFilter}
                        setDefaultFilter={setDefaultFilter}
                        defaultDateRange={defaultDateRange}
                        setDefaultDateRange={setDefaultDateRange}
                        persons={persons}
                    />

                    <div className="section-divider"></div>

                    <PeopleSettings
                        persons={persons}
                        assets={assets}
                        onAddPerson={onAddPerson}
                        onUpdatePerson={onUpdatePerson}
                        onReorderPersons={onReorderPersons}
                        onDeletePerson={onDeletePerson}
                        onRefreshAssets={onRefreshAssets}
                        onShowDeleteConfirm={handleShowDeleteConfirm}
                    />

                    <div className="section-divider"></div>

                    <CategoriesSettings
                        categories={categories}
                        assets={assets}
                        addCategory={addCategory}
                        updateCategory={updateCategory}
                        deleteCategory={deleteCategory}
                        onRefreshAssets={onRefreshAssets}
                        onShowDeleteConfirm={handleShowDeleteConfirm}
                    />

                    <div className="section-divider"></div>

                    <BackupSettings
                        onShowRestoreModal={() => setShowRestoreModal(true)}
                    />

                    <div className="section-divider"></div>

                    <SecuritySettings />
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
    );
}
