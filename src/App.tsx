import { useState, useEffect } from 'react';
import './index.css';
import { usePortfolio } from './hooks/usePortfolio';
import type { Asset, FamilyMember } from './types';
import { OWNER_LABELS } from './types';
import { PrivacyProvider } from './contexts/PrivacyContext';
import Header from './components/Header';
import FamilyFilter from './components/FamilyFilter';
import TotalWorthChart from './components/TotalWorthChart';
import AllocationChart from './components/AllocationChart';
import MyMovers from './components/MyMovers';
import AddAssetModal from './components/AddAssetModal';
import UpdateValueModal from './components/UpdateValueModal';
import PersonManager from './components/PersonManager';

const PERSON_LABELS_KEY = 'wealth-person-labels';

function AppContent() {
  const {
    filteredAssets,
    selectedOwner,
    setSelectedOwner,
    stats,
    addAsset,
    updateAssetValue,
    deleteAsset,
    updateAsset
  } = usePortfolio();

  // Person labels state with localStorage persistence
  const [personLabels, setPersonLabels] = useState<Record<Exclude<FamilyMember, 'all'>, string>>(() => {
    const stored = localStorage.getItem(PERSON_LABELS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall through
      }
    }
    return { ...OWNER_LABELS };
  });

  useEffect(() => {
    localStorage.setItem(PERSON_LABELS_KEY, JSON.stringify(personLabels));
  }, [personLabels]);

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

  const handleUpdatePerson = (key: Exclude<FamilyMember, 'all'>, name: string) => {
    setPersonLabels(prev => ({ ...prev, [key]: name }));
  };

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="app">
      <Header
        date={today}
        onAddAsset={() => setShowAddModal(true)}
        onManagePersons={() => setShowPersonManager(true)}
      />

      <main className="main-content">
        <FamilyFilter
          selected={selectedOwner}
          onSelect={setSelectedOwner}
        />

        <div className="charts-row">
          <TotalWorthChart assets={filteredAssets} />
          <AllocationChart stats={stats} />
        </div>

        <MyMovers
          assets={filteredAssets}
          personLabels={personLabels}
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
        persons={personLabels}
        onUpdatePerson={handleUpdatePerson}
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
