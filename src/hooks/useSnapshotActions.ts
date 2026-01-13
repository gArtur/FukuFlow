import { useCallback } from 'react';
import { ApiClient } from '../lib/apiClient';

interface SnapshotData {
    value: number;
    date: string;
    investmentChange: number;
    notes: string;
}

interface UseSnapshotActionsProps {
    refreshAssets: () => Promise<void>;
    closeSnapshotModal?: () => void;
    closeEditSnapshotModal?: () => void;
}

/**
 * Hook to manage snapshot-related operations.
 * Extracted from App.tsx for better separation of concerns.
 */
export function useSnapshotActions({
    refreshAssets,
    closeSnapshotModal,
    closeEditSnapshotModal,
}: UseSnapshotActionsProps) {
    const handleSubmitSnapshot = useCallback(
        async (assetId: string, snapshot: SnapshotData) => {
            try {
                await ApiClient.addSnapshot(assetId, snapshot);
                await refreshAssets();
                closeSnapshotModal?.();
            } catch (error) {
                console.error('Failed to add snapshot:', error);
                throw error;
            }
        },
        [refreshAssets, closeSnapshotModal]
    );

    const handleUpdateSnapshot = useCallback(
        async (id: number, data: SnapshotData) => {
            try {
                await ApiClient.updateSnapshot(id, data);
                await refreshAssets();
                closeEditSnapshotModal?.();
            } catch (error) {
                console.error('Failed to update snapshot:', error);
                throw error;
            }
        },
        [refreshAssets, closeEditSnapshotModal]
    );

    const handleDeleteSnapshot = useCallback(
        async (id: number) => {
            try {
                await ApiClient.deleteSnapshot(id);
                await refreshAssets();
                closeEditSnapshotModal?.();
            } catch (error) {
                console.error('Failed to delete snapshot:', error);
                throw error;
            }
        },
        [refreshAssets, closeEditSnapshotModal]
    );

    const handleImportSnapshots = useCallback(
        async (
            assetId: string,
            snapshots: SnapshotData[]
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
        },
        [refreshAssets]
    );

    return {
        handleSubmitSnapshot,
        handleUpdateSnapshot,
        handleDeleteSnapshot,
        handleImportSnapshots,
    };
}
