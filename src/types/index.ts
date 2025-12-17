export type AssetCategory = 'stocks' | 'etf' | 'crypto' | 'real_estate' | 'bonds' | 'cash' | 'other';
export type FamilyMember = 'self' | 'wife' | 'daughter' | 'all';

export interface ValueEntry {
    date: string;
    value: number;
}

export interface Asset {
    id: string;
    name: string;
    category: AssetCategory;
    owner: Exclude<FamilyMember, 'all'>;
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
    byOwner: Record<Exclude<FamilyMember, 'all'>, number>;
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

export const OWNER_LABELS: Record<Exclude<FamilyMember, 'all'>, string> = {
    self: 'Me',
    wife: 'Wife',
    daughter: 'Daughter'
};
