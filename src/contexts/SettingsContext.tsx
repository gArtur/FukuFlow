import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ApiClient } from '../lib/apiClient';
import type { AssetCategory, TimeRange } from '../types';

interface Settings {
    currency: string;
    defaultFilter: string;
    defaultDateRange: TimeRange;
    theme: 'dark' | 'light' | 'high-contrast';
    showAssetHeatmap: boolean;
}

interface Category {
    id: string;
    key: AssetCategory; // Use AssetCategory type but it's dynamic
    label: string;
    color: string;
    isDefault: boolean;
}

interface SettingsContextType {
    currency: string;
    setCurrency: (currency: string) => Promise<void>;
    theme: 'dark' | 'light' | 'high-contrast';
    setTheme: (theme: 'dark' | 'light' | 'high-contrast') => Promise<void>;
    showAssetHeatmap: boolean;
    setShowAssetHeatmap: (show: boolean) => Promise<void>;
    defaultFilter: string;
    setDefaultFilter: (filter: string) => Promise<void>;
    defaultDateRange: TimeRange;
    setDefaultDateRange: (range: TimeRange) => Promise<void>;
    categories: Category[];
    addCategory: (label: string, color: string) => Promise<void>;
    updateCategory: (id: string, label: string, color: string) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    isLoading: boolean;
    formatAmount: (amount: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>({
        currency: 'USD',
        defaultFilter: 'all',
        defaultDateRange: '1Y',
        theme: 'dark',
        showAssetHeatmap: false,
    });
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [settingsData, categoriesData] = await Promise.all([
                    ApiClient.getSettings(),
                    ApiClient.getCategories(),
                ]);

                if (settingsData) {
                    const theme = settingsData.theme || 'dark';
                    setSettings({
                        currency: settingsData.currency || 'USD',
                        defaultFilter: settingsData.defaultFilter || 'all',
                        defaultDateRange: settingsData.defaultDateRange || '1Y',
                        theme: theme,
                        showAssetHeatmap: settingsData.showAssetHeatmap === 'true' || settingsData.showAssetHeatmap === true,
                    });

                    // Apply theme to document
                    document.documentElement.setAttribute('data-theme', theme);
                }

                if (categoriesData) {
                    setCategories(categoriesData);
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const setCurrency = async (newCurrency: string) => {
        try {
            await ApiClient.updateSetting('currency', newCurrency);
            setSettings(prev => ({ ...prev, currency: newCurrency }));
        } catch (error) {
            console.error('Failed to update currency:', error);
        }
    };

    const setTheme = async (newTheme: 'dark' | 'light' | 'high-contrast') => {
        try {
            await ApiClient.updateSetting('theme', newTheme);
            setSettings(prev => ({ ...prev, theme: newTheme }));
            document.documentElement.setAttribute('data-theme', newTheme);
        } catch (error) {
            console.error('Failed to update theme:', error);
        }
    };

    const setShowAssetHeatmap = async (show: boolean) => {
        try {
            await ApiClient.updateSetting('showAssetHeatmap', String(show));
            setSettings(prev => ({ ...prev, showAssetHeatmap: show }));
        } catch (error) {
            console.error('Failed to update showAssetHeatmap:', error);
        }
    };

    const setDefaultFilter = async (newFilter: string) => {
        try {
            await ApiClient.updateSetting('defaultFilter', newFilter);
            setSettings(prev => ({ ...prev, defaultFilter: newFilter }));
        } catch (error) {
            console.error('Failed to update default filter:', error);
        }
    };

    const setDefaultDateRange = async (newRange: TimeRange) => {
        try {
            await ApiClient.updateSetting('defaultDateRange', newRange);
            setSettings(prev => ({ ...prev, defaultDateRange: newRange }));
        } catch (error) {
            console.error('Failed to update default date range:', error);
        }
    };

    const addCategory = async (label: string, color: string) => {
        try {
            const newCategory = await ApiClient.addCategory(label, color);
            setCategories(prev => [...prev, newCategory]);
        } catch (error) {
            console.error('Failed to add category:', error);
            throw error;
        }
    };

    const updateCategory = async (id: string, label: string, color: string) => {
        try {
            const updated = await ApiClient.updateCategory(id, label, color);
            setCategories(prev => prev.map(c => (c.id === id ? { ...c, ...updated } : c)));
        } catch (error) {
            console.error('Failed to update category:', error);
            throw error;
        }
    };

    const deleteCategory = async (id: string) => {
        try {
            await ApiClient.deleteCategory(id);
            setCategories(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error('Failed to delete category:', error);
            throw error;
        }
    };

    const formatAmount = (amount: number) => {
        if (settings.currency === 'PLN') {
            return (
                new Intl.NumberFormat('en-US', {
                    style: 'decimal',
                    maximumFractionDigits: 0,
                }).format(amount) + ' zł'
            );
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: settings.currency,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <SettingsContext.Provider
            value={{
                currency: settings.currency,
                setCurrency,
                theme: settings.theme,
                setTheme,
                showAssetHeatmap: settings.showAssetHeatmap,
                setShowAssetHeatmap,
                defaultFilter: settings.defaultFilter,
                setDefaultFilter,
                defaultDateRange: settings.defaultDateRange,
                setDefaultDateRange,
                categories,
                addCategory,
                updateCategory,
                deleteCategory,
                isLoading,
                formatAmount,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
