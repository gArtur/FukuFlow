import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Asset, FamilyMember, PortfolioStats, ValueEntry } from '../types';
import { SAMPLE_ASSETS } from '../data/sampleData';

const STORAGE_KEY = 'wealth-portfolio';

const getInitialAssets = (): Asset[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed.length > 0) return parsed;
        } catch {
            // Fall through to sample data
        }
    }
    // Load sample data if no existing data
    return SAMPLE_ASSETS;
};

export function usePortfolio() {
    const [assets, setAssets] = useState<Asset[]>(getInitialAssets);
    const [selectedOwner, setSelectedOwner] = useState<FamilyMember>('all');

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    }, [assets]);

    const filteredAssets = selectedOwner === 'all'
        ? assets
        : assets.filter(a => a.owner === selectedOwner);

    const calculateStats = useCallback((assetList: Asset[]): PortfolioStats => {
        const stats: PortfolioStats = {
            totalValue: 0,
            totalInvested: 0,
            totalGain: 0,
            gainPercentage: 0,
            byCategory: {
                stocks: 0, etf: 0, crypto: 0, real_estate: 0, bonds: 0, cash: 0, other: 0
            },
            byOwner: {
                self: 0, wife: 0, daughter: 0
            }
        };

        assetList.forEach(asset => {
            stats.totalValue += asset.currentValue;
            stats.totalInvested += asset.purchaseAmount;
            stats.byCategory[asset.category] += asset.currentValue;
            stats.byOwner[asset.owner] += asset.currentValue;
        });

        stats.totalGain = stats.totalValue - stats.totalInvested;
        stats.gainPercentage = stats.totalInvested > 0
            ? (stats.totalGain / stats.totalInvested) * 100
            : 0;

        return stats;
    }, []);

    const addAsset = useCallback((asset: Omit<Asset, 'id' | 'valueHistory'>) => {
        const newAsset: Asset = {
            ...asset,
            id: uuidv4(),
            valueHistory: [{ date: new Date().toISOString(), value: asset.currentValue }]
        };
        setAssets(prev => [...prev, newAsset]);
    }, []);

    const updateAssetValue = useCallback((id: string, newValue: number) => {
        setAssets(prev => prev.map(asset => {
            if (asset.id !== id) return asset;
            const newEntry: ValueEntry = { date: new Date().toISOString(), value: newValue };
            return {
                ...asset,
                currentValue: newValue,
                valueHistory: [...asset.valueHistory, newEntry]
            };
        }));
    }, []);

    const deleteAsset = useCallback((id: string) => {
        setAssets(prev => prev.filter(asset => asset.id !== id));
    }, []);

    const updateAsset = useCallback((id: string, updates: Partial<Omit<Asset, 'id' | 'valueHistory'>>) => {
        setAssets(prev => prev.map(asset => {
            if (asset.id !== id) return asset;
            return { ...asset, ...updates };
        }));
    }, []);

    return {
        assets,
        filteredAssets,
        selectedOwner,
        setSelectedOwner,
        stats: calculateStats(filteredAssets),
        totalStats: calculateStats(assets),
        addAsset,
        updateAssetValue,
        deleteAsset,
        updateAsset
    };
}
