import { createContext, useContext, useState, type ReactNode } from 'react';
import { formatCurrency } from '../utils';

import { useSettings } from './SettingsContext';

interface PrivacyContextType {
    isHidden: boolean;
    togglePrivacy: () => void;
    formatAmount: (value: number, showPercentOnly?: boolean) => string;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
    const { currency } = useSettings();
    const [isHidden, setIsHidden] = useState(() => {
        const saved = localStorage.getItem('privacyMode');
        return saved ? JSON.parse(saved) : false;
    });

    const togglePrivacy = () => {
        setIsHidden((prev: boolean) => {
            const newValue = !prev;
            localStorage.setItem('privacyMode', JSON.stringify(newValue));
            return newValue;
        });
    };

    const formatAmount = (value: number, _showPercentOnly?: boolean): string => {
        if (isHidden) {
            return '•••••';
        }

        return formatCurrency(value, currency, 0);
    };

    return (
        <PrivacyContext.Provider value={{ isHidden, togglePrivacy, formatAmount }}>
            {children}
        </PrivacyContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrivacy() {
    const context = useContext(PrivacyContext);
    if (context === undefined) {
        throw new Error('usePrivacy must be used within a PrivacyProvider');
    }
    return context;
}
