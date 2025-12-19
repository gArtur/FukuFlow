import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import type { Person, Asset } from '../types';
import '../settings_styles.css';
import ConfirmationModal from './ConfirmationModal';
import RestoreDataModal from './RestoreDataModal';
import {
    GeneralSettings,
    PeopleSettings,
    CategoriesSettings,
    BackupSettings
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

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
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
                    <button className="settings-tab" onClick={() => scrollToSection('general')}>
                        General
                    </button>
                    <button className="settings-tab" onClick={() => scrollToSection('people')}>
                        People
                    </button>
                    <button className="settings-tab" onClick={() => scrollToSection('categories')}>
                        Categories
                    </button>
                    <button className="settings-tab" onClick={() => scrollToSection('data')}>
                        Backup
                    </button>
                </nav>

                {/* Content Area */}
                <div className="settings-content">
                    <GeneralSettings
                        currency={currency}
                        setCurrency={setCurrency}
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
