import { useState, useEffect, useCallback } from 'react';
import './index.css';
import { usePortfolio } from './hooks/usePortfolio';
import type { Asset, Person, ValueEntry } from './types';
import { PrivacyProvider } from './contexts/PrivacyContext';
import Header from './components/Header';
import FamilyFilter from './components/FamilyFilter';
import TotalWorthChart from './components/TotalWorthChart';
import AllocationChart from './components/AllocationChart';
import MyMovers from './components/MyMovers';
import AddAssetModal from './components/AddAssetModal';
import AddSnapshotModal from './components/AddSnapshotModal';
import EditSnapshotModal from './components/EditSnapshotModal';
import InvestmentDetail from './components/InvestmentDetail';
import PersonManager from './components/PersonManager';
import { ApiClient } from './lib/apiClient';
import MigrationTool from './components/MigrationTool';

type ViewState = 'dashboard' | 'detail';

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

  // View state management
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showEditSnapshotModal, setShowEditSnapshotModal] = useState(false);
  const [showPersonManager, setShowPersonManager] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [snapshotAsset, setSnapshotAsset] = useState<Asset | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<(ValueEntry & { id: number }) | null>(null);

  // Navigation handlers
  const handleCardClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setCurrentView('detail');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedAsset(null);
  };

  // Snapshot handlers
  const handleAddSnapshot = (asset: Asset) => {
    setSnapshotAsset(asset);
    setShowSnapshotModal(true);
  };

  const handleSubmitSnapshot = async (assetId: string, snapshot: { value: number; date: string; investmentChange: number; notes: string }) => {
    try {
      await ApiClient.addSnapshot(assetId, snapshot);
      await refreshAssets();
      if (selectedAsset && selectedAsset.id === assetId) {
        const updatedAssets = await ApiClient.getAssets();
        const updatedAsset = updatedAssets.find((a: Asset) => a.id === assetId);
        if (updatedAsset) setSelectedAsset(updatedAsset);
      }
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
      if (selectedAsset) {
        const updatedAssets = await ApiClient.getAssets();
        const updatedAsset = updatedAssets.find((a: Asset) => a.id === selectedAsset.id);
        if (updatedAsset) setSelectedAsset(updatedAsset);
      }
    } catch (error) {
      console.error('Failed to update snapshot:', error);
    }
  };

  const handleDeleteSnapshot = async (id: number) => {
    try {
      await ApiClient.deleteSnapshot(id);
      await refreshAssets();
      if (selectedAsset) {
        const updatedAssets = await ApiClient.getAssets();
        const updatedAsset = updatedAssets.find((a: Asset) => a.id === selectedAsset.id);
        if (updatedAsset) setSelectedAsset(updatedAsset);
      }
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
    }
  };

  const handleImportSnapshots = async (snapshots: { date: string; value: number; investmentChange: number; notes: string }[]) => {
    if (!selectedAsset) return;
    try {
      for (const snapshot of snapshots) {
        await ApiClient.addSnapshot(selectedAsset.id, snapshot);
      }
      await refreshAssets();
      const updatedAssets = await ApiClient.getAssets();
      const updatedAsset = updatedAssets.find((a: Asset) => a.id === selectedAsset.id);
      if (updatedAsset) setSelectedAsset(updatedAsset);
    } catch (error) {
      console.error('Failed to import snapshots:', error);
    }
  };

  // Edit/Delete handlers
  const handleEdit = () => {
    if (selectedAsset) {
      setEditAsset(selectedAsset);
      setShowAddModal(true);
    }
  };

  const handleDelete = async () => {
    if (selectedAsset) {
      await deleteAsset(selectedAsset.id);
      handleBackToDashboard();
    }
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
    setPersons(prev => prev.map(p =>
      p.id === id ? { ...p, name: name.trim() } : p
    ));
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

  if (assetsLoading || personsLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your wealth data...</p>
      </div>
    );
  }

  // Render Investment Detail View
  if (currentView === 'detail' && selectedAsset) {
    return (
      <div className="app">
        <InvestmentDetail
          asset={selectedAsset}
          persons={persons}
          onBack={handleBackToDashboard}
          onAddSnapshot={() => handleAddSnapshot(selectedAsset)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onEditSnapshot={handleEditSnapshot}
          onImportSnapshots={handleImportSnapshots}
        />

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

        <AddAssetModal
          isOpen={showAddModal}
          onClose={handleCloseAddModal}
          onSubmit={addAsset}
          editAsset={editAsset}
          onUpdate={updateAsset}
          persons={persons}
        />
      </div>
    );
  }

  // Render Dashboard View
  return (
    <div className="app">
      <Header
        date={today}
        onAddAsset={() => setShowAddModal(true)}
        onManagePersons={() => setShowPersonManager(true)}
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
          <AllocationChart stats={stats} />
        </div>

        <MyMovers
          assets={filteredAssets}
          persons={persons}
          onCardClick={handleCardClick}
          onAddSnapshot={handleAddSnapshot}
        />
      </main>

      <button
        className="fab"
        onClick={() => setShowAddModal(true)}
        aria-label="Add investment"
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
        onSubmit={handleSubmitSnapshot}
      />

      <PersonManager
        isOpen={showPersonManager}
        onClose={() => setShowPersonManager(false)}
        persons={persons}
        onAddPerson={handleAddPerson}
        onUpdatePerson={handleUpdatePerson}
        onDeletePerson={handleDeletePerson}
      />
    </div>
  );
}

function App() {
  return (
    <PrivacyProvider>
      <AppContent />
    </PrivacyProvider>
  );
}

export default App;
