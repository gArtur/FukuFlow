import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { Asset } from '../types';
import { ApiClient } from '../lib/apiClient';
import { computePortfolioStats } from '../utils/portfolioStats';

export function usePortfolio() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [selectedOwner, setSelectedOwner] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAssets = useCallback(async () => {
        setIsLoading(true);
        try {
            setError(null);
            const data = await ApiClient.getAssets();
            setAssets(data);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
            setError('Failed to load assets. Please try again.');
            toast.error('Failed to load assets');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // fetchAssets sets isLoading(true) synchronously for immediate UI feedback before
        // the async API call resolves. This is intentional — not a cascading state update.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAssets();
    }, [fetchAssets]);

    const filteredAssets =
        selectedOwner === 'all' ? assets : assets.filter(a => a.ownerId === selectedOwner);

    const addAsset = useCallback(async (asset: Omit<Asset, 'id' | 'valueHistory'>) => {
        try {
            const newAsset = await ApiClient.addAsset(asset);
            setAssets(prev => [...prev, newAsset]);
            toast.success('Asset added successfully');
        } catch (error) {
            console.error('Failed to add asset:', error);
            toast.error('Failed to add asset');
        }
    }, []);

    const deleteAsset = useCallback(async (id: string) => {
        try {
            await ApiClient.deleteAsset(id);
            setAssets(prev => prev.filter(asset => asset.id !== id));
            toast.success('Asset deleted');
        } catch (error) {
            console.error('Failed to delete asset:', error);
            toast.error('Failed to delete asset');
        }
    }, []);

    const updateAsset = useCallback(
        async (id: string, updates: Partial<Omit<Asset, 'id' | 'valueHistory'>>) => {
            try {
                await ApiClient.updateAsset(id, updates);
                setAssets(prev =>
                    prev.map(asset => {
                        if (asset.id !== id) return asset;
                        return { ...asset, ...updates };
                    })
                );
                toast.success('Asset updated successfully');
            } catch (error) {
                console.error('Failed to update asset:', error);
                toast.error('Failed to update asset');
            }
        },
        []
    );

    return {
        allAssets: assets,
        filteredAssets,
        selectedOwner,
        setSelectedOwner,
        stats: computePortfolioStats(filteredAssets),
        totalStats: computePortfolioStats(assets),
        addAsset,
        deleteAsset,
        updateAsset,
        isLoading,
        error,
        refreshAssets: fetchAssets,
    };
}
