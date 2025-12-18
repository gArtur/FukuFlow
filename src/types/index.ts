export type AssetCategory = string;

// Person management
export interface Person {
    id: string;
    name: string;
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
