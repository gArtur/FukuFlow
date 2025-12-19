import { useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency as formatCurrencyUtil, formatPercent as formatPercentUtil } from '../utils';

/**
 * Hook for settings-aware currency formatting.
 * Uses the currency setting from SettingsContext.
 */
export function useFormatCurrency() {
    const { currency } = useSettings();
    return useCallback(
        (amount: number) => formatCurrencyUtil(amount, currency),
        [currency]
    );
}

/**
 * Hook for percentage formatting with sign prefix.
 */
export function useFormatPercent() {
    return useCallback(
        (value: number, decimals: number = 2) => formatPercentUtil(value, decimals),
        []
    );
}

/**
 * Combined hook for all common formatting utilities.
 */
export function useFormatting() {
    const formatCurrency = useFormatCurrency();
    const formatPercent = useFormatPercent();
    return { formatCurrency, formatPercent };
}
