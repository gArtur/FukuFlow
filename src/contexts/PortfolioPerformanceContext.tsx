import { createContext, useContext, type ReactNode } from 'react';
import type { Asset } from '../types';
import {
    usePortfolioPerformance,
    type PerformanceWindow,
    type PortfolioPerformance,
} from '../hooks/usePortfolioPerformance';

const PortfolioPerformanceContext = createContext<PortfolioPerformance | undefined>(undefined);

interface PortfolioPerformanceProviderProps {
    assets: Asset[];
    window: PerformanceWindow;
    children: ReactNode;
}

/**
 * Computes portfolio performance once for the given (assets, window) and shares it
 * with the asset cards, the table, and the Total Worth chart, so they stop each
 * recomputing the same window-relative numbers on every render.
 */
export function PortfolioPerformanceProvider({
    assets,
    window,
    children,
}: PortfolioPerformanceProviderProps) {
    const performance = usePortfolioPerformance(assets, window);
    return (
        <PortfolioPerformanceContext.Provider value={performance}>
            {children}
        </PortfolioPerformanceContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePortfolioPerformanceContext(): PortfolioPerformance {
    const context = useContext(PortfolioPerformanceContext);
    if (context === undefined) {
        throw new Error(
            'usePortfolioPerformanceContext must be used within a PortfolioPerformanceProvider'
        );
    }
    return context;
}
