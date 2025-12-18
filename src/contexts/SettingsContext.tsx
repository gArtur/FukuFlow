import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ApiClient } from '../lib/apiClient';
import type { AssetCategory } from '../types';

interface Settings {
    currency: string;
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
    categories: Category[];
    addCategory: (label: string, color: string) => Promise<void>;
    updateCategory: (id: string, label: string, color: string) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    isLoading: boolean;
    formatAmount: (amount: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>({ currency: 'USD' });
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [settingsData, categoriesData] = await Promise.all([
                    ApiClient.getSettings(),
                    ApiClient.getCategories()
                ]);

                if (settingsData && settingsData.currency) {
                    setSettings({ currency: settingsData.currency });
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
            setSettings({ currency: newCurrency });
        } catch (error) {
            console.error('Failed to update currency:', error);
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
            setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
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
            return new Intl.NumberFormat('en-US', {
                style: 'decimal',
                maximumFractionDigits: 0
            }).format(amount) + ' zł';
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: settings.currency,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <SettingsContext.Provider value={{
            currency: settings.currency,
            setCurrency,
            categories,
            addCategory,
            updateCategory,
            deleteCategory,
            isLoading,
            formatAmount
        }}>
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
