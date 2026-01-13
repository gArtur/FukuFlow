/**
 * Shared utility functions for the FukuFlow application
 */

/**
 * Parse a string value to a number, handling European comma decimals.
 * Returns 0 if the value cannot be parsed.
 */
export function parseValue(val: string): number {
    return parseFloat(val.replace(',', '.')) || 0;
}

/**
 * Handle numeric input validation for form fields.
 * Only allows valid numeric characters (including European comma format).
 *
 * @param inputValue - The input value to validate
 * @param setter - State setter function
 * @param allowNegative - Whether to allow negative numbers (default: false)
 */
export function handleNumberInput(
    inputValue: string,
    setter: (val: string) => void,
    allowNegative: boolean = false
): void {
    const pattern = allowNegative ? /^-?[0-9]*[.,]?[0-9]*$/ : /^[0-9]*[.,]?[0-9]*$/;

    if (inputValue === '' || (allowNegative && inputValue === '-') || pattern.test(inputValue)) {
        setter(inputValue);
    }
}

/**
 * Format a number as currency.
 *
 * @param value - The numeric value to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(
    value: number,
    currency: string = 'USD',
    decimals: number = 0
): string {
    if (currency === 'PLN') {
        return (
            new Intl.NumberFormat('en-US', {
                style: 'decimal',
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            }).format(value) + ' zł'
        );
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}

/**
 * Format a percentage with sign.
 *
 * @param value - The percentage value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string with + or - prefix
 */
export function formatPercent(value: number, decimals: number = 2): string {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(decimals)}%`;
}

/**
 * Get today's date in YYYY-MM-DD format.
 */
export function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Generate a simple hash code from a string (for consistent color generation).
 */
export function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}
