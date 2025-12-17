import { useState, useEffect, useCallback } from 'react';
import type { Asset, PortfolioStats, ValueEntry } from '../types';
import { ApiClient } from '../lib/apiClient';

export function usePortfolio() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [selectedOwner, setSelectedOwner] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);

    const fetchAssets = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await ApiClient.getAssets();
            setAssets(data);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const filteredAssets = selectedOwner === 'all'
        ? assets
        : assets.filter(a => a.ownerId === selectedOwner);

    const calculateStats = useCallback((assetList: Asset[]): PortfolioStats => {
        const stats: PortfolioStats = {
            totalValue: 0,
            totalInvested: 0,
            totalGain: 0,
            gainPercentage: 0,
            byCategory: {
                stocks: 0, etf: 0, crypto: 0, real_estate: 0, bonds: 0, cash: 0, other: 0
            },
            byOwner: {}
        };

        assetList.forEach(asset => {
            stats.totalValue += asset.currentValue;
            stats.totalInvested += asset.purchaseAmount;
            stats.byCategory[asset.category] += asset.currentValue;

            if (!stats.byOwner[asset.ownerId]) {
                stats.byOwner[asset.ownerId] = 0;
            }
            stats.byOwner[asset.ownerId] += asset.currentValue;
        });

        stats.totalGain = stats.totalValue - stats.totalInvested;
        stats.gainPercentage = stats.totalInvested > 0
            ? (stats.totalGain / stats.totalInvested) * 100
            : 0;

        return stats;
    }, []);

    const addAsset = useCallback(async (asset: Omit<Asset, 'id' | 'valueHistory'>) => {
        try {
            const newAsset = await ApiClient.addAsset(asset);
            setAssets(prev => [...prev, newAsset]);
        } catch (error) {
            console.error('Failed to add asset:', error);
        }
    }, []);

    const updateAssetValue = useCallback(async (id: string, newValue: number) => {
        try {
            await ApiClient.updateAssetValue(id, newValue);
            setAssets(prev => prev.map(asset => {
                if (asset.id !== id) return asset;
                const newEntry: ValueEntry = { date: new Date().toISOString(), value: newValue };
                return {
                    ...asset,
                    currentValue: newValue,
                    valueHistory: [...asset.valueHistory, newEntry]
                };
            }));
        } catch (error) {
            console.error('Failed to update asset value:', error);
        }
    }, []);

    const deleteAsset = useCallback(async (id: string) => {
        try {
            await ApiClient.deleteAsset(id);
            setAssets(prev => prev.filter(asset => asset.id !== id));
        } catch (error) {
            console.error('Failed to delete asset:', error);
        }
    }, []);

    const updateAsset = useCallback(async (id: string, updates: Partial<Omit<Asset, 'id' | 'valueHistory'>>) => {
        try {
            await ApiClient.updateAsset(id, updates);
            setAssets(prev => prev.map(asset => {
                if (asset.id !== id) return asset;
                return { ...asset, ...updates };
            }));
        } catch (error) {
            console.error('Failed to update asset:', error);
        }
    }, []);

    return {
        allAssets: assets,
        filteredAssets,
        selectedOwner,
        setSelectedOwner,
        stats: calculateStats(filteredAssets),
        totalStats: calculateStats(assets),
        addAsset,
        updateAssetValue,
        deleteAsset,
        updateAsset,
        isLoading,
        refreshAssets: fetchAssets
    };
}
