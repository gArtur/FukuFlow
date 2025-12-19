import type { Person } from '../../types';
import type { TimeRange } from '../../types';
import CustomSelect from './CustomSelect';

interface GeneralSettingsProps {
    currency: string;
    setCurrency: (val: string) => Promise<void>;
    defaultFilter: string;
    setDefaultFilter: (val: string) => Promise<void>;
    defaultDateRange: TimeRange;
    setDefaultDateRange: (range: TimeRange) => Promise<void>;
    persons: Person[];
}

const CURRENCY_OPTIONS = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'PLN', label: 'PLN (zł)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'JPY', label: 'JPY (¥)' },
    { value: 'CHF', label: 'CHF (Fr)' },
    { value: 'CAD', label: 'CAD ($)' },
    { value: 'AUD', label: 'AUD ($)' }
];

const DATE_RANGE_OPTIONS: TimeRange[] = ['YTD', '1Y', '5Y', 'MAX'];

export default function GeneralSettings({
    currency,
    setCurrency,
    defaultFilter,
    setDefaultFilter,
    defaultDateRange,
    setDefaultDateRange,
    persons
}: GeneralSettingsProps) {
    const filterOptions = [
        { value: 'all', label: 'All' },
        ...persons.map(p => ({ value: p.id, label: p.name }))
    ];

    return (
        <section id="general" className="settings-section">
            <div className="movers-header" style={{ marginTop: 0 }}>
                <div className="movers-header-left">
                    <h2 className="movers-title">General</h2>
                </div>
            </div>
            <div className="settings-group-card">
                <div className="settings-row">
                    <div className="settings-group">
                        <CustomSelect
                            label="Currency Selection"
                            value={currency || 'USD'}
                            options={CURRENCY_OPTIONS}
                            onChange={setCurrency}
                        />
                    </div>
                    <div className="settings-group">
                        <CustomSelect
                            label="Default Diagram Filter"
                            value={defaultFilter || 'all'}
                            options={filterOptions}
                            onChange={setDefaultFilter}
                        />
                    </div>
                    <div className="settings-group">
                        <label className="settings-label">Default Date Range</label>
                        <div className="date-range-pills">
                            {DATE_RANGE_OPTIONS.map(range => (
                                <button
                                    key={range}
                                    className={`date-pill ${defaultDateRange === range ? 'active' : ''}`}
                                    onClick={() => setDefaultDateRange(range)}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
