export type AssetCategory = 'stocks' | 'etf' | 'crypto' | 'real_estate' | 'bonds' | 'cash' | 'other';

// Person management
export interface Person {
    id: string;
    name: string;
}

export interface ValueEntry {
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
    currency: string;
    valueHistory: ValueEntry[];
}

export interface PortfolioStats {
    totalValue: number;
    totalInvested: number;
    totalGain: number;
    gainPercentage: number;
    byCategory: Record<AssetCategory, number>;
    byOwner: Record<string, number>; // Changed to use person IDs
}

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
    stocks: 'Stocks',
    etf: 'ETFs',
    crypto: 'Crypto',
    real_estate: 'Real Estate',
    bonds: 'Bonds',
    cash: 'Cash',
    other: 'Other'
};

export const CATEGORY_COLORS: Record<AssetCategory, string> = {
    stocks: '#6C5CE7',
    etf: '#00D9A5',
    crypto: '#FDCB6E',
    real_estate: '#E17055',
    bonds: '#74B9FF',
    cash: '#55EFC4',
    other: '#A29BFE'
};

// Default person IDs for migration
export const DEFAULT_PERSON_IDS = {
    self: 'person-self',
    wife: 'person-wife',
    daughter: 'person-daughter'
} as const;
