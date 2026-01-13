import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import './index.css';
import { usePortfolio } from './hooks/usePortfolio';
import { usePersons } from './hooks/usePersons';
import type { Asset, Person, ValueEntry } from './types';
import { PrivacyProvider } from './contexts/PrivacyContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import type { HeaderProps } from './components/Header';
import FamilyFilter from './components/FamilyFilter';
import TotalWorthChart from './components/TotalWorthChart';
import AllocationChart from './components/AllocationChart';
import MyMovers from './components/MyMovers';
import AddAssetModal from './components/AddAssetModal';
import AddSnapshotModal from './components/AddSnapshotModal';
import EditSnapshotModal from './components/EditSnapshotModal';
import ImportCSVModal from './components/ImportCSVModal';
import AssetDetail from './components/AssetDetail';
import Settings from './components/Settings';
import PortfolioHeatmap from './components/PortfolioHeatmap';
import { ApiClient } from './lib/apiClient';
import MigrationTool from './components/MigrationTool';
import LoginPage from './components/LoginPage';
import SetupPage from './components/SetupPage';
import ScrollToTop from './components/ScrollToTop';
import { generateAssetUrl, resolveAssetFromSlug } from './utils/navigation';

/**
 * Shared logic and state for the application
 */
function AppContent() {
    const { defaultFilter, isLoading: settingsLoading } = useSettings();
    const {
        filteredAssets,
        selectedOwner,
        setSelectedOwner,
        stats,
        addAsset,
        deleteAsset,
        updateAsset,
        allAssets,
        isLoading: assetsLoading,
        refreshAssets,
    } = usePortfolio();

    // Use the usePersons hook for person management
    const {
        persons,
        isLoading: personsLoading,
        addPerson,
        updatePerson,
        deletePerson,
        reorderPersons,
    } = usePersons();

    // Set filter based on settings (initial load and updates)
    useEffect(() => {
        if (!settingsLoading) {
            setSelectedOwner(defaultFilter || 'all');
        }
    }, [settingsLoading, defaultFilter, setSelectedOwner]);

    const navigate = useNavigate();

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSnapshotModal, setShowSnapshotModal] = useState(false);
    const [showEditSnapshotModal, setShowEditSnapshotModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editAsset, setEditAsset] = useState<Asset | null>(null);
    const [snapshotAsset, setSnapshotAsset] = useState<Asset | null>(null);
    const [editingSnapshot, setEditingSnapshot] = useState<(ValueEntry & { id: number }) | null>(
        null
    );

    // Navigation handlers
    const handleCardClick = (asset: Asset) => {
        const owner = persons.find(p => p.id === asset.ownerId);
        if (owner) {
            navigate(generateAssetUrl(owner.name, asset.name));
        }
    };

    const handleBackToDashboard = () => {
        navigate('/');
    };

    // Snapshot handlers
    const handleAddSnapshot = (asset: Asset) => {
        setSnapshotAsset(asset);
        setShowSnapshotModal(true);
    };

    // Global snapshot handler (from header) - opens modal with asset selection
    const handleGlobalAddSnapshot = () => {
        setSnapshotAsset(null);
        setShowSnapshotModal(true);
    };

    const handleSubmitSnapshot = async (
        assetId: string,
        snapshot: { value: number; date: string; investmentChange: number; notes: string }
    ) => {
        try {
            await ApiClient.addSnapshot(assetId, snapshot);
            await refreshAssets();
            setShowSnapshotModal(false);
        } catch (error) {
            console.error('Failed to add snapshot:', error);
        }
    };

    const handleEditSnapshot = (snapshot: ValueEntry & { id: number }) => {
        setEditingSnapshot(snapshot);
        setShowEditSnapshotModal(true);
    };

    const handleUpdateSnapshot = async (
        id: number,
        data: { date: string; value: number; investmentChange: number; notes: string }
    ) => {
        try {
            await ApiClient.updateSnapshot(id, data);
            await refreshAssets();
            setShowEditSnapshotModal(false);
        } catch (error) {
            console.error('Failed to update snapshot:', error);
        }
    };

    const handleDeleteSnapshot = async (id: number) => {
        try {
            await ApiClient.deleteSnapshot(id);
            await refreshAssets();
            setShowEditSnapshotModal(false);
        } catch (error) {
            console.error('Failed to delete snapshot:', error);
        }
    };

    const handleImportSnapshots = async (
        assetId: string,
        snapshots: { date: string; value: number; investmentChange: number; notes: string }[]
    ): Promise<{ success: number; failed: number; errors: string[] }> => {
        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const snapshot of snapshots) {
            try {
                await ApiClient.addSnapshot(assetId, snapshot);
                success++;
            } catch {
                failed++;
                errors.push(`Failed to import entry for ${snapshot.date}`);
            }
        }

        await refreshAssets();
        return { success, failed, errors };
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setEditAsset(null);
    };

    // Wrapper for deletePerson that also updates the filter if needed
    const handleDeletePerson = async (id: string) => {
        const success = await deletePerson(id);
        if (success && selectedOwner === id) {
            setSelectedOwner('all');
        }
    };

    const hasLocalData =
        localStorage.getItem('wealth-persons') || localStorage.getItem('wealth-portfolio');
    const isInitialLoad =
        (assetsLoading && allAssets.length === 0) || personsLoading || settingsLoading;

    const headerProps = {
        onAddSnapshot: handleGlobalAddSnapshot,
    };

    if (isInitialLoad) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
                <p>Loading your wealth data...</p>
            </div>
        );
    }

    return (
        <>
            <Routes>
                <Route
                    path="/"
                    element={
                        <div className="app">
                            <Header onAddSnapshot={handleGlobalAddSnapshot} />

                            <main className="main-content">
                                {hasLocalData && (
                                    <MigrationTool onComplete={() => window.location.reload()} />
                                )}

                                <FamilyFilter
                                    persons={persons}
                                    selected={selectedOwner}
                                    onSelect={setSelectedOwner}
                                />

                                <div className="charts-row">
                                    <TotalWorthChart assets={filteredAssets} stats={stats} />
                                    <AllocationChart
                                        stats={stats}
                                        assets={filteredAssets}
                                        persons={persons}
                                    />
                                </div>

                                <MyMovers
                                    assets={filteredAssets}
                                    persons={persons}
                                    onCardClick={handleCardClick}
                                    onAddSnapshot={handleAddSnapshot}
                                    onAddAsset={() => setShowAddModal(true)}
                                />
                            </main>

                            <button
                                className="fab"
                                onClick={handleGlobalAddSnapshot}
                                aria-label="Add snapshot"
                            >
                                +
                            </button>

                            <AddAssetModal
                                isOpen={showAddModal}
                                onClose={handleCloseAddModal}
                                onSubmit={addAsset}
                                editAsset={editAsset}
                                onUpdate={updateAsset}
                                persons={persons}
                            />
                        </div>
                    }
                />

                <Route
                    path="/:ownerSlug/:assetSlug"
                    element={
                        <AssetDetailView
                            headerProps={headerProps}
                            allAssets={allAssets}
                            persons={persons}
                            onAddSnapshot={handleAddSnapshot}
                            onEdit={(asset: Asset) => {
                                setEditAsset(asset);
                                setShowAddModal(true);
                            }}
                            onDelete={async (id: string) => {
                                await deleteAsset(id);
                                handleBackToDashboard();
                            }}
                            onEditSnapshot={handleEditSnapshot}
                            setShowImportModal={setShowImportModal}
                            // Modals state passed down
                            editAsset={editAsset}
                            // Edit Snapshot Modal Handling
                            showEditSnapshotModal={showEditSnapshotModal}
                            setShowEditSnapshotModal={setShowEditSnapshotModal}
                            editingSnapshot={editingSnapshot}
                            handleUpdateSnapshot={handleUpdateSnapshot}
                            handleDeleteSnapshot={handleDeleteSnapshot}
                            // Import Modal Handling
                            showImportModal={showImportModal}
                            onImport={handleImportSnapshots}
                            showAddModal={showAddModal}
                            onCloseAddModal={handleCloseAddModal}
                            onAddAsset={addAsset}
                            onUpdateAsset={updateAsset}
                        />
                    }
                />

                <Route
                    path="/heatmap"
                    element={
                        <div className="app">
                            <Header {...headerProps} />
                            <main className="main-content">
                                <PortfolioHeatmap assets={allAssets} persons={persons} />
                            </main>
                        </div>
                    }
                />

                <Route
                    path="/settings"
                    element={
                        <div className="app">
                            <Header {...headerProps} />
                            <main className="main-content">
                                <Settings
                                    persons={persons}
                                    onAddPerson={addPerson}
                                    onUpdatePerson={updatePerson}
                                    onReorderPersons={reorderPersons}
                                    onDeletePerson={handleDeletePerson}
                                    assets={allAssets}
                                    onRefreshAssets={refreshAssets}
                                />
                            </main>
                        </div>
                    }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <AddSnapshotModal
                isOpen={showSnapshotModal}
                onClose={() => setShowSnapshotModal(false)}
                asset={snapshotAsset}
                assets={allAssets}
                persons={persons}
                onSubmit={handleSubmitSnapshot}
            />
        </>
    );
}

interface AssetDetailViewProps {
    allAssets: Asset[];
    persons: Person[];
    onAddSnapshot: (asset: Asset) => void;
    onEdit: (asset: Asset) => void;
    onDelete: (id: string) => void;
    onEditSnapshot: (snapshot: ValueEntry & { id: number }) => void;
    setShowImportModal: (show: boolean) => void;
    showEditSnapshotModal: boolean;
    setShowEditSnapshotModal: (show: boolean) => void;
    editingSnapshot: (ValueEntry & { id: number }) | null;
    handleUpdateSnapshot: (
        id: number,
        data: { value: number; date: string; investmentChange: number; notes: string }
    ) => void;
    handleDeleteSnapshot: (id: number) => void;
    showImportModal: boolean;
    onImport: (
        assetId: string,
        snapshots: { date: string; value: number; investmentChange: number; notes: string }[]
    ) => Promise<{ success: number; failed: number; errors: string[] }>;
    showAddModal: boolean;
    onCloseAddModal: () => void;
    onAddAsset: (asset: Omit<Asset, 'id' | 'valueHistory'>) => void;
    onUpdateAsset: (id: string, updates: Partial<Omit<Asset, 'id' | 'valueHistory'>>) => void;
    editAsset: Asset | null;
    headerProps: HeaderProps;
}

/**
 * Component for the Asset Detail page
 */
function AssetDetailView({
    allAssets,
    persons,
    onAddSnapshot,
    onEdit,
    onDelete,
    onEditSnapshot,
    setShowImportModal,
    showEditSnapshotModal,
    setShowEditSnapshotModal,
    editingSnapshot,
    handleUpdateSnapshot,
    handleDeleteSnapshot,
    showImportModal,
    onImport,
    showAddModal,
    onCloseAddModal,
    onAddAsset,
    onUpdateAsset,
    editAsset,
    headerProps,
}: AssetDetailViewProps) {
    const { ownerSlug, assetSlug } = useParams<{ ownerSlug: string; assetSlug: string }>();

    const { asset } = resolveAssetFromSlug(allAssets, persons, ownerSlug, assetSlug);

    if (!asset) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="app">
            <Header {...headerProps} onAddSnapshot={() => onAddSnapshot(asset)} />
            <main className="main-content">
                <AssetDetail
                    asset={asset}
                    persons={persons}
                    onEdit={() => onEdit(asset)}
                    onDelete={() => onDelete(asset.id)}
                    onEditSnapshot={onEditSnapshot}
                    onOpenImportModal={() => setShowImportModal(true)}
                />
            </main>

            <button className="fab" onClick={() => onAddSnapshot(asset)} aria-label="Add snapshot">
                +
            </button>

            <EditSnapshotModal
                isOpen={showEditSnapshotModal}
                onClose={() => setShowEditSnapshotModal(false)}
                snapshot={editingSnapshot}
                onSubmit={handleUpdateSnapshot}
                onDelete={handleDeleteSnapshot}
            />

            <ImportCSVModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                assetName={asset.name}
                ownerName={persons.find(p => p.id === asset.ownerId)?.name}
                onImport={snapshots => onImport(asset.id, snapshots)}
            />

            <AddAssetModal
                isOpen={showAddModal}
                onClose={onCloseAddModal}
                onSubmit={onAddAsset}
                editAsset={editAsset}
                onUpdate={onUpdateAsset}
                persons={persons}
            />
        </div>
    );
}

/**
 * Auth wrapper - shows login/setup pages or main content based on auth state
 */
function AuthenticatedApp() {
    const { isAuthenticated, needsSetup, isLoading } = useAuth();

    // Show loading while checking auth status
    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    // Show setup page for first-time users
    if (needsSetup) {
        return <SetupPage />;
    }

    // Show login page for unauthenticated users
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    // Show main app for authenticated users
    return (
        <SettingsProvider>
            <PrivacyProvider>
                <AppContent />
            </PrivacyProvider>
        </SettingsProvider>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <AuthProvider>
                <AuthenticatedApp />
            </AuthProvider>
        </BrowserRouter>
    );
}
