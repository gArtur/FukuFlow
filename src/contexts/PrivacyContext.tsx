import { createContext, useContext, useState, type ReactNode } from 'react';

interface PrivacyContextType {
    isHidden: boolean;
    togglePrivacy: () => void;
    formatAmount: (value: number, showPercentOnly?: boolean) => string;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
    const [isHidden, setIsHidden] = useState(false);

    const togglePrivacy = () => setIsHidden(prev => !prev);

    const formatAmount = (value: number, _showPercentOnly?: boolean): string => {
        if (isHidden) {
            return '•••••';
        }
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <PrivacyContext.Provider value={{ isHidden, togglePrivacy, formatAmount }}>
            {children}
        </PrivacyContext.Provider>
    );
}

export function usePrivacy() {
    const context = useContext(PrivacyContext);
    if (context === undefined) {
        throw new Error('usePrivacy must be used within a PrivacyProvider');
    }
    return context;
}
