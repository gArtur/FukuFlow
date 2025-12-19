export type AssetCategory = string;

// Person management
export interface Person {
    id: string;
    name: string;
    displayOrder?: number;
}

export interface ValueEntry {
    id?: number;
    date: string;
    value: number;
    investmentChange?: number;  // Can be positive (adding money) or negative (withdrawing)
    notes?: string;
}

export interface Asset {
    id: string;
    name: string;
    category: AssetCategory;
    ownerId: string; // Changed from owner to ownerId
    purchaseDate: string;
    purchaseAmount: number;
    currentValue: number;
    valueHistory: ValueEntry[];
}

export interface PortfolioStats {
    totalValue: number;
    totalInvested: number;
    totalGain: number;
    gainPercentage: number;
    byCategory: Record<string, number>;
    byOwner: Record<string, number>; // Changed to use person IDs
}

// Default person IDs for migration
export const DEFAULT_PERSON_IDS = {
    self: 'person-self',
    wife: 'person-wife',
    daughter: 'person-daughter'
} as const;

export type TimeRange = 'YTD' | '1Y' | '5Y' | 'MAX' | 'Custom';

export const CATEGORY_LABELS: Record<string, string> = {
    etf: 'ETFs',
    crypto: 'Crypto',
    real_estate: 'Real Estate',
    stocks: 'Stocks',
    cash: 'Cash',
    bonds: 'Bonds',
    metal: 'Metals'
};

export const CATEGORY_COLORS: Record<string, string> = {
    etf: '#00D9A5',
    crypto: '#F59E0B',
    real_estate: '#8B5CF6',
    stocks: '#3B82F6',
    cash: '#10B981',
    bonds: '#6366f1',
    metal: '#94a3b8'
};
