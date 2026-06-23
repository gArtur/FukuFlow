import { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { Asset, AssetCategory, Person } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { ApiClient } from '../lib/apiClient';
import { parseValue, handleNumberInput } from '../utils';
import { CURRENCY_OPTIONS, THEME_OPTIONS } from '../constants/settingsOptions';

interface OnboardingWizardProps {
    isOpen: boolean;
    /** Skip or close: parent persists dismissal and hides the wizard. */
    onClose: () => void;
    /** Called after the first value is saved so the parent can refresh data. */
    onComplete: () => void;
    addPerson: (name: string) => Promise<Person | undefined>;
    addAsset: (asset: Omit<Asset, 'id' | 'valueHistory'>) => Promise<Asset | undefined>;
    /** Optional: enables removing a person added by mistake during onboarding. */
    deletePerson?: (id: string) => Promise<boolean>;
}

type Step = 'welcome' | 'preferences' | 'person' | 'asset' | 'value' | 'done';

// Steps that count toward the "Step X of N" progress indicator.
const STEP_ORDER: Step[] = ['preferences', 'person', 'asset', 'value'];

const STEP_TITLES: Record<Step, string> = {
    welcome: 'Welcome',
    preferences: 'Your preferences',
    person: 'Your household',
    asset: 'Your first asset',
    value: "Today's value",
    done: 'All set',
};

/**
 * First-run guided setup. Walks a brand-new user from an empty install to a
 * populated, configured dashboard - preferences -> household -> first asset ->
 * first value - reusing the existing settings/portfolio hooks. No menu hunting.
 */
export default function OnboardingWizard({
    isOpen,
    onClose,
    onComplete,
    addPerson,
    addAsset,
    deletePerson,
}: OnboardingWizardProps) {
    const { categories, currency, setCurrency, theme, setTheme } = useSettings();

    const [step, setStep] = useState<Step>('welcome');
    const [submitting, setSubmitting] = useState(false);

    const [personName, setPersonName] = useState('Me');
    const [createdPersons, setCreatedPersons] = useState<Person[]>([]);
    const [ownerId, setOwnerId] = useState('');
    const [assetName, setAssetName] = useState('');
    const [category, setCategory] = useState<AssetCategory>(categories[0]?.key || 'stocks');
    const [createdAsset, setCreatedAsset] = useState<Asset | null>(null);
    const [value, setValue] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

    if (!isOpen) return null;

    const stepNumber = STEP_ORDER.indexOf(step) + 1;

    const handleAddPerson = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = personName.trim();
        if (!name || submitting) return;
        setSubmitting(true);
        const person = await addPerson(name);
        setSubmitting(false);
        // On failure the hook already shows a toast; keep the typed name.
        if (!person) return;
        setCreatedPersons(prev => [...prev, person]);
        setPersonName('');
    };

    const handleRemovePerson = async (id: string) => {
        if (!deletePerson) return;
        const removed = await deletePerson(id);
        if (removed) setCreatedPersons(prev => prev.filter(p => p.id !== id));
    };

    const handleContinueFromPerson = () => {
        if (createdPersons.length === 0) return;
        // Default the first asset's owner to a valid person.
        setOwnerId(prev =>
            prev && createdPersons.some(p => p.id === prev) ? prev : createdPersons[0].id
        );
        setStep('asset');
    };

    const handleCreateAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ownerId || !assetName.trim() || submitting) return;
        setSubmitting(true);
        const asset = await addAsset({
            name: assetName.trim(),
            category,
            ownerId,
            purchaseDate: new Date().toISOString().split('T')[0],
            purchaseAmount: 0,
            currentValue: 0,
        });
        setSubmitting(false);
        if (!asset) return;
        setCreatedAsset(asset);
        setStep('value');
    };

    const handleCreateValue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createdAsset || !value || submitting) return;
        const amount = parseValue(value);
        setSubmitting(true);
        try {
            // investmentChange equals the value so invested capital matches the
            // current value on day one - the first snapshot shows 0 gain, not a
            // spurious gain equal to the whole balance.
            await ApiClient.addSnapshot(createdAsset.id, {
                value: amount,
                date: new Date(date).toISOString(),
                investmentChange: amount,
                notes: '',
            });
            onComplete();
            setStep('done');
        } catch (error) {
            console.error('Failed to save first value:', error);
            toast.error('Failed to save value');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" data-testid="onboarding-wizard">
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{STEP_TITLES[step]}</h2>
                    {stepNumber > 0 && (
                        <span className="onboarding-step-count">
                            Step {stepNumber} of {STEP_ORDER.length}
                        </span>
                    )}
                    <button
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Close setup"
                        data-testid="onboarding-close"
                    >
                        ×
                    </button>
                </div>

                {step === 'welcome' && (
                    <div className="modal-body">
                        <div className="empty-state">
                            <div className="empty-icon">👋</div>
                            <h3 className="empty-title">Welcome to FukuFlow</h3>
                            <p className="empty-text">
                                Your password is set. Let&apos;s get your portfolio up and running in
                                a few quick steps - no menus to hunt through.
                            </p>
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={onClose}
                                data-testid="onboarding-skip"
                            >
                                Skip for now
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => setStep('preferences')}
                                data-testid="onboarding-get-started"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                )}

                {step === 'preferences' && (
                    <form
                        className="modal-body"
                        onSubmit={e => {
                            e.preventDefault();
                            setStep('person');
                        }}
                    >
                        <p className="empty-text onboarding-step-intro">
                            Choose how FukuFlow looks and which currency to track your wealth in. You
                            can change these anytime in Settings.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Currency</label>
                            <select
                                className="form-select"
                                value={currency}
                                onChange={e => setCurrency(e.target.value)}
                                data-testid="onboarding-currency-select"
                            >
                                {CURRENCY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Theme</label>
                            <select
                                className="form-select"
                                value={theme}
                                onChange={e =>
                                    setTheme(e.target.value as 'dark' | 'light' | 'high-contrast')
                                }
                                data-testid="onboarding-theme-select"
                            >
                                {THEME_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={onClose}
                                data-testid="onboarding-skip"
                            >
                                Skip setup
                            </button>
                            <button type="submit" className="btn-primary">
                                Continue
                            </button>
                        </div>
                    </form>
                )}

                {step === 'person' && (
                    <div className="modal-body">
                        <p className="empty-text onboarding-step-intro">
                            Add everyone whose assets you want to track - yourself and any family
                            members. You can add or change these later in Settings.
                        </p>
                        <form className="onboarding-add-row" onSubmit={handleAddPerson}>
                            <input
                                type="text"
                                className="form-input"
                                value={personName}
                                onChange={e => setPersonName(e.target.value)}
                                placeholder="e.g., Me, Spouse, Child"
                                autoFocus
                                data-testid="onboarding-person-input"
                            />
                            <button
                                type="submit"
                                className="btn-secondary onboarding-add-btn"
                                disabled={submitting || !personName.trim()}
                                data-testid="onboarding-person-add"
                            >
                                {submitting ? 'Adding…' : 'Add'}
                            </button>
                        </form>

                        {createdPersons.length > 0 && (
                            <ul className="onboarding-person-list" data-testid="onboarding-person-list">
                                {createdPersons.map(p => (
                                    <li key={p.id} className="onboarding-person-chip">
                                        <span>{p.name}</span>
                                        {deletePerson && (
                                            <button
                                                type="button"
                                                className="onboarding-person-remove"
                                                onClick={() => handleRemovePerson(p.id)}
                                                aria-label={`Remove ${p.name}`}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={onClose}
                                data-testid="onboarding-skip"
                            >
                                Skip setup
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleContinueFromPerson}
                                disabled={createdPersons.length === 0}
                                data-testid="onboarding-person-submit"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {step === 'asset' && (
                    <form className="modal-body" onSubmit={handleCreateAsset}>
                        <p className="empty-text onboarding-step-intro">
                            Add your first asset - a stock, some crypto, a property, anything you
                            want to track.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Asset Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={assetName}
                                onChange={e => setAssetName(e.target.value)}
                                placeholder="e.g., Apple Stock, Bitcoin, Apartment"
                                autoFocus
                                required
                                data-testid="onboarding-asset-name-input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select
                                className="form-select"
                                value={category}
                                onChange={e => setCategory(e.target.value as AssetCategory)}
                                data-testid="onboarding-asset-category-select"
                            >
                                {categories.map(cat => (
                                    <option key={cat.key} value={cat.key}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {createdPersons.length > 1 && (
                            <div className="form-group">
                                <label className="form-label">Owner</label>
                                <select
                                    className="form-select"
                                    value={ownerId}
                                    onChange={e => setOwnerId(e.target.value)}
                                    data-testid="onboarding-asset-owner-select"
                                >
                                    {createdPersons.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={onClose}
                                data-testid="onboarding-skip"
                            >
                                Skip setup
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={submitting || !assetName.trim()}
                                data-testid="onboarding-asset-submit"
                            >
                                {submitting ? 'Adding…' : 'Continue'}
                            </button>
                        </div>
                    </form>
                )}

                {step === 'value' && (
                    <form className="modal-body" onSubmit={handleCreateValue}>
                        <p className="empty-text onboarding-step-intro">
                            What&apos;s <strong>{createdAsset?.name}</strong> worth today? This is its
                            first data point - add more over time to watch it grow.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                                data-testid="onboarding-value-date"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Current Value</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="form-input"
                                value={value}
                                onChange={e => handleNumberInput(e.target.value, setValue)}
                                placeholder="e.g., 5000"
                                autoFocus
                                required
                                data-testid="onboarding-value-input"
                            />
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={onClose}
                                data-testid="onboarding-skip"
                            >
                                Skip setup
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={submitting || !value}
                                data-testid="onboarding-value-submit"
                            >
                                {submitting ? 'Saving…' : 'Finish'}
                            </button>
                        </div>
                    </form>
                )}

                {step === 'done' && (
                    <div className="modal-body">
                        <div className="empty-state">
                            <div className="empty-icon">🎉</div>
                            <h3 className="empty-title">You&apos;re all set!</h3>
                            <p className="empty-text">
                                {createdAsset?.name} is on your dashboard. Use the{' '}
                                <strong>+</strong> button anytime to record new values or add more
                                assets.
                            </p>
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={onClose}
                                data-testid="onboarding-done"
                            >
                                Go to my dashboard
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
