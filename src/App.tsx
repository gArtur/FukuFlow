
import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import './index.css';
import { usePortfolio } from './hooks/usePortfolio';
import type { Asset, Person, ValueEntry } from './types';
import { PrivacyProvider } from './contexts/PrivacyContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Header from './components/Header';
import FamilyFilter from './components/FamilyFilter';
import TotalWorthChart from './components/TotalWorthChart';
import AllocationChart from './components/AllocationChart';
import MyMovers from './components/MyMovers';
import AddAssetModal from './components/AddAssetModal';
import AddSnapshotModal from './components/AddSnapshotModal';
import EditSnapshotModal from './components/EditSnapshotModal';
import ImportCSVModal from './components/ImportCSVModal';
import InvestmentDetail from './components/InvestmentDetail';
import Settings from './components/Settings';
import { ApiClient } from './lib/apiClient';
import MigrationTool from './components/MigrationTool';

/**
 * Shared logic and state for the application
 */
function AppContent() {
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
    refreshAssets
  } = usePortfolio();

  const [persons, setPersons] = useState<Person[]>([]);
  const [personsLoading, setPersonsLoading] = useState(true);

  const fetchPersons = useCallback(async () => {
    setPersonsLoading(true);
    try {
      const data = await ApiClient.getPersons();
      setPersons(data);
    } catch (error) {
      console.error('Failed to fetch persons:', error);
    } finally {
      setPersonsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersons();
  }, [fetchPersons]);

  const navigate = useNavigate();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showEditSnapshotModal, setShowEditSnapshotModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [snapshotAsset, setSnapshotAsset] = useState<Asset | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<(ValueEntry & { id: number }) | null>(null);

  // Navigation handlers
  const handleCardClick = (asset: Asset) => {
    navigate(`/asset/${asset.id}`);
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

  const handleSubmitSnapshot = async (assetId: string, snapshot: { value: number; date: string; investmentChange: number; notes: string }) => {
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

  const handleUpdateSnapshot = async (id: number, data: { date: string; value: number; investmentChange: number; notes: string }) => {
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

  const handleImportSnapshots = async (assetId: string, snapshots: { date: string; value: number; investmentChange: number; notes: string }[]): Promise<{ success: number; failed: number; errors: string[] }> => {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const snapshot of snapshots) {
      try {
        await ApiClient.addSnapshot(assetId, snapshot);
        success++;
      } catch (error) {
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

  // Person management handlers
  const handleAddPerson = async (name: string) => {
    try {
      const newPerson = await ApiClient.addPerson(name);
      setPersons(prev => [...prev, newPerson]);
    } catch (error) {
      console.error('Failed to add person:', error);
    }
  };

  const handleUpdatePerson = async (id: string, name: string) => {
    try {
      // Logic for updating person name could be added here if needed in backend
      setPersons(prev => prev.map(p =>
        p.id === id ? { ...p, name: name.trim() } : p
      ));
    } catch (error) {
      console.error('Failed to update person:', error);
    }
  };

  const handleDeletePerson = async (id: string) => {
    const person = persons.find(p => p.id === id);
    if (!person) return;

    const assetsCount = allAssets.filter(a => a.ownerId === id).length;

    let confirmMessage = `Are you sure you want to delete "${person.name}"?`;
    if (assetsCount > 0) {
      confirmMessage = `"${person.name}" has ${assetsCount} investment(s). Deleting this person will also delete all their investments. This action cannot be undone.\n\nAre you sure?`;
    }

    if (confirm(confirmMessage)) {
      try {
        await ApiClient.deletePerson(id);
        setPersons(prev => prev.filter(p => p.id !== id));
        if (selectedOwner === id) {
          setSelectedOwner('all');
        }
      } catch (error) {
        console.error('Failed to delete person:', error);
      }
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const hasLocalData = localStorage.getItem('wealth-persons') || localStorage.getItem('wealth-portfolio');
  const isInitialLoad = (assetsLoading && allAssets.length === 0) || personsLoading;

  const headerProps = {
    date: today,
    onAddSnapshot: handleGlobalAddSnapshot
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
    <Routes>
      <Route path="/" element={
        <div className="app">
          <Header
            date={today}
            onAddSnapshot={handleGlobalAddSnapshot}
          />

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
              <AllocationChart stats={stats} assets={filteredAssets} persons={persons} />
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

          <AddSnapshotModal
            isOpen={showSnapshotModal}
            onClose={() => setShowSnapshotModal(false)}
            asset={snapshotAsset}
            assets={allAssets}
            persons={persons}
            onSubmit={handleSubmitSnapshot}
          />
        </div>
      } />

      <Route path="/asset/:id" element={
        <AssetDetailView
          headerProps={headerProps}
          allAssets={allAssets}
          persons={persons}
          onAddSnapshot={handleAddSnapshot}
          onEdit={(asset: Asset) => { setEditAsset(asset); setShowAddModal(true); }}
          onDelete={async (id: string) => {
            if (confirm('Are you sure you want to delete this investment?')) {
              await deleteAsset(id);
              handleBackToDashboard();
            }
          }}
          onEditSnapshot={handleEditSnapshot}
          setShowImportModal={setShowImportModal}
          // Modals state passed down
          showSnapshotModal={showSnapshotModal}
          setShowSnapshotModal={setShowSnapshotModal}
          snapshotAsset={snapshotAsset}
          handleSubmitSnapshot={handleSubmitSnapshot}
          showEditSnapshotModal={showEditSnapshotModal}
          setShowEditSnapshotModal={setShowEditSnapshotModal}
          editingSnapshot={editingSnapshot}
          handleUpdateSnapshot={handleUpdateSnapshot}
          handleDeleteSnapshot={handleDeleteSnapshot}
          showImportModal={showImportModal}
          onImport={(snapshots: any, id: string) => handleImportSnapshots(id, snapshots)}
          showAddModal={showAddModal}
          onCloseAddModal={handleCloseAddModal}
          onAddAsset={addAsset}
          onUpdateAsset={updateAsset}
          editAsset={editAsset}
        />
      } />

      <Route path="/settings" element={
        <div className="app">
          <Header {...headerProps} />
          <main className="main-content">
            <Settings
              persons={persons}
              onAddPerson={handleAddPerson}
              onUpdatePerson={handleUpdatePerson}
              onDeletePerson={handleDeletePerson}
            />
          </main>
        </div>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * Component for the Investment Detail page
 */
function AssetDetailView({
  allAssets,
  persons,
  onAddSnapshot,
  onEdit,
  onDelete,
  onEditSnapshot,
  setShowImportModal,
  showSnapshotModal,
  setShowSnapshotModal,
  snapshotAsset,
  handleSubmitSnapshot,
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
  headerProps
}: any) {
  const { id } = useParams<{ id: string }>();
  const asset = allAssets.find((a: Asset) => a.id === id);

  if (!asset) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app">
      <Header {...headerProps} onAddSnapshot={() => onAddSnapshot(asset)} />
      <main className="main-content">
        <InvestmentDetail
          asset={asset}
          persons={persons}
          onAddSnapshot={() => onAddSnapshot(asset)}
          onEdit={() => onEdit(asset)}
          onDelete={() => onDelete(asset.id)}
          onEditSnapshot={onEditSnapshot}
          onOpenImportModal={() => setShowImportModal(true)}
        />
      </main>

      <button
        className="fab"
        onClick={() => onAddSnapshot(asset)}
        aria-label="Add snapshot"
      >
        +
      </button>

      <AddSnapshotModal
        isOpen={showSnapshotModal}
        onClose={() => setShowSnapshotModal(false)}
        asset={snapshotAsset}
        onSubmit={handleSubmitSnapshot}
      />

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
        onImport={(snapshots) => onImport(snapshots, asset.id)}
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

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <PrivacyProvider>
          <AppContent />
        </PrivacyProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
