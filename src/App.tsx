import { useState, useEffect, useCallback } from 'react';
import './index.css';
import { usePortfolio } from './hooks/usePortfolio';
import type { Asset, Person } from './types';
import { PrivacyProvider } from './contexts/PrivacyContext';
import Header from './components/Header';
import FamilyFilter from './components/FamilyFilter';
import TotalWorthChart from './components/TotalWorthChart';
import AllocationChart from './components/AllocationChart';
import MyMovers from './components/MyMovers';
import AddAssetModal from './components/AddAssetModal';
import UpdateValueModal from './components/UpdateValueModal';
import PersonManager from './components/PersonManager';
import { ApiClient } from './lib/apiClient';
import MigrationTool from './components/MigrationTool';

function AppContent() {
  const {
    filteredAssets,
    selectedOwner,
    setSelectedOwner,
    stats,
    addAsset,
    updateAssetValue,
    deleteAsset,
    updateAsset,
    allAssets,
    isLoading: assetsLoading
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPersonManager, setShowPersonManager] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);

  const handleUpdateValue = (id: string) => {
    const asset = filteredAssets.find(a => a.id === id);
    if (asset) {
      setSelectedAsset(asset);
      setShowUpdateModal(true);
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditAsset(asset);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this investment?')) {
      deleteAsset(id);
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setEditAsset(null);
  };

  const handleAddPerson = async (name: string) => {
    try {
      const newPerson = await ApiClient.addPerson(name);
      setPersons(prev => [...prev, newPerson]);
    } catch (error) {
      console.error('Failed to add person:', error);
    }
  };

  const handleUpdatePerson = async (id: string, name: string) => {
    // Note: Backend implementation for updating person name might be needed
    // or we can just update local state if the API doesn't support it yet
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
          <TotalWorthChart assets={filteredAssets} />
          <AllocationChart stats={stats} />
        </div>

        <MyMovers
          assets={filteredAssets}
          persons={persons}
          onUpdateValue={handleUpdateValue}
          onDelete={handleDelete}
          onEdit={handleEdit}
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

      <UpdateValueModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        asset={selectedAsset}
        onSubmit={updateAssetValue}
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
