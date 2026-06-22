// Shared option lists for app preferences, reused by the Settings page and the
// onboarding wizard so the available currencies/themes stay in sync.

export const THEME_OPTIONS = [
    { value: 'dark', label: 'Dark (Default)' },
    { value: 'light', label: 'Light' },
    { value: 'high-contrast', label: 'High Contrast' },
];

export const CURRENCY_OPTIONS = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'PLN', label: 'PLN (zł)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'JPY', label: 'JPY (¥)' },
    { value: 'CHF', label: 'CHF (Fr)' },
    { value: 'CAD', label: 'CAD ($)' },
    { value: 'AUD', label: 'AUD ($)' },
];
