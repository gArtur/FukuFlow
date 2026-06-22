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
}

type Step = 'welcome' | 'preferences' | 'person' | 'asset' | 'value' | 'done';

// Steps that count toward the "Step X of N" progress indicator.
const STEP_ORDER: Step[] = ['preferences', 'person', 'asset', 'value'];

const STEP_TITLES: Record<Step, string> = {
    welcome: 'Welcome',
    preferences: 'Your preferences',
    person: 'Who owns it?',
    asset: 'Your first asset',
    value: "Today's value",
    done: 'All set',
};

/**
 * First-run guided setup. Walks a brand-new user from an empty install to a
 * populated, configured dashboard — preferences → first person → first asset →
 * first value — reusing the existing settings/portfolio hooks. No menu hunting.
 */
export default function OnboardingWizard({
    isOpen,
    onClose,
    onComplete,
    addPerson,
    addAsset,
}: OnboardingWizardProps) {
    const { categories, currency, setCurrency, theme, setTheme } = useSettings();

    const [step, setStep] = useState<Step>('welcome');
    const [submitting, setSubmitting] = useState(false);

    const [personName, setPersonName] = useState('Me');
    const [createdPerson, setCreatedPerson] = useState<Person | null>(null);
    const [assetName, setAssetName] = useState('');
    const [category, setCategory] = useState<AssetCategory>(categories[0]?.key || 'stocks');
    const [createdAsset, setCreatedAsset] = useState<Asset | null>(null);
    const [value, setValue] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

    if (!isOpen) return null;

    const stepNumber = STEP_ORDER.indexOf(step) + 1;

    const handleCreatePerson = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = personName.trim();
        if (!name || submitting) return;
        setSubmitting(true);
        const person = await addPerson(name);
        setSubmitting(false);
        // On failure the hook already shows a toast; stay on this step.
        if (!person) return;
        setCreatedPerson(person);
        setStep('asset');
    };

    const handleCreateAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createdPerson || !assetName.trim() || submitting) return;
        setSubmitting(true);
        const asset = await addAsset({
            name: assetName.trim(),
            category,
            ownerId: createdPerson.id,
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
            // current value on day one — the first snapshot shows 0 gain, not a
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
                                a few quick steps — no menus to hunt through.
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
                        <div className="form-row">
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
                                        setTheme(
                                            e.target.value as 'dark' | 'light' | 'high-contrast'
                                        )
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
                    <form className="modal-body" onSubmit={handleCreatePerson}>
                        <p className="empty-text onboarding-step-intro">
                            Who owns these assets? Add yourself or a family member — you can add more
                            people later.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={personName}
                                onChange={e => setPersonName(e.target.value)}
                                placeholder="e.g., Me"
                                autoFocus
                                required
                                data-testid="onboarding-person-input"
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
                                disabled={submitting || !personName.trim()}
                                data-testid="onboarding-person-submit"
                            >
                                {submitting ? 'Adding…' : 'Continue'}
                            </button>
                        </div>
                    </form>
                )}

                {step === 'asset' && (
                    <form className="modal-body" onSubmit={handleCreateAsset}>
                        <p className="empty-text onboarding-step-intro">
                            Add your first asset for {createdPerson?.name} — a stock, some crypto, a
                            property, anything you want to track.
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
                            first data point — add more over time to watch it grow.
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
