import { useState, useCallback } from 'react';
import type { Asset, ValueEntry } from '../types';

interface ModalState {
    showAddModal: boolean;
    showSnapshotModal: boolean;
    showEditSnapshotModal: boolean;
    showImportModal: boolean;
    editAsset: Asset | null;
    snapshotAsset: Asset | null;
    editingSnapshot: (ValueEntry & { id: number }) | null;
}

const initialState: ModalState = {
    showAddModal: false,
    showSnapshotModal: false,
    showEditSnapshotModal: false,
    showImportModal: false,
    editAsset: null,
    snapshotAsset: null,
    editingSnapshot: null,
};

export interface ModalActions {
    // Add Asset Modal
    openAddModal: () => void;
    openEditModal: (asset: Asset) => void;
    closeAddModal: () => void;

    // Snapshot Modal
    openSnapshotModal: (asset?: Asset) => void;
    closeSnapshotModal: () => void;

    // Edit Snapshot Modal
    openEditSnapshotModal: (snapshot: ValueEntry & { id: number }) => void;
    closeEditSnapshotModal: () => void;

    // Import Modal
    openImportModal: () => void;
    closeImportModal: () => void;
}

export interface UseModalsReturn extends ModalState, ModalActions {}

/**
 * Hook to manage all modal states in the application.
 * Extracted from App.tsx to reduce component complexity.
 */
export function useModals(): UseModalsReturn {
    const [state, setState] = useState<ModalState>(initialState);

    // Add Asset Modal Actions
    const openAddModal = useCallback(() => {
        setState(prev => ({ ...prev, showAddModal: true, editAsset: null }));
    }, []);

    const openEditModal = useCallback((asset: Asset) => {
        setState(prev => ({ ...prev, showAddModal: true, editAsset: asset }));
    }, []);

    const closeAddModal = useCallback(() => {
        setState(prev => ({ ...prev, showAddModal: false, editAsset: null }));
    }, []);

    // Snapshot Modal Actions
    const openSnapshotModal = useCallback((asset?: Asset) => {
        setState(prev => ({
            ...prev,
            showSnapshotModal: true,
            snapshotAsset: asset || null,
        }));
    }, []);

    const closeSnapshotModal = useCallback(() => {
        setState(prev => ({ ...prev, showSnapshotModal: false, snapshotAsset: null }));
    }, []);

    // Edit Snapshot Modal Actions
    const openEditSnapshotModal = useCallback((snapshot: ValueEntry & { id: number }) => {
        setState(prev => ({ ...prev, showEditSnapshotModal: true, editingSnapshot: snapshot }));
    }, []);

    const closeEditSnapshotModal = useCallback(() => {
        setState(prev => ({ ...prev, showEditSnapshotModal: false, editingSnapshot: null }));
    }, []);

    // Import Modal Actions
    const openImportModal = useCallback(() => {
        setState(prev => ({ ...prev, showImportModal: true }));
    }, []);

    const closeImportModal = useCallback(() => {
        setState(prev => ({ ...prev, showImportModal: false }));
    }, []);

    return {
        ...state,
        openAddModal,
        openEditModal,
        closeAddModal,
        openSnapshotModal,
        closeSnapshotModal,
        openEditSnapshotModal,
        closeEditSnapshotModal,
        openImportModal,
        closeImportModal,
    };
}
