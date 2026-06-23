import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import type { Asset, AssetCategory, Person } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { ApiClient } from '../lib/apiClient';
import { parseValue, handleNumberInput, formatCurrency } from '../utils';
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

// Full step order, used for Back navigation.
const FLOW: Step[] = ['welcome', 'preferences', 'person', 'asset', 'value', 'done'];
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

// In-progress wizard state is mirrored to localStorage so closing the browser
// mid-onboarding resumes on the same step with the same details.
const PROGRESS_KEY = 'onboardingProgress';

interface OnboardingProgress {
    step: Step;
    personName: string;
    createdPersons: Person[];
    createdAsset: Asset | null;
    ownerId: string;
    assetName: string;
    category: AssetCategory;
    value: string;
    invested: string;
    date: string;
}

function loadProgress(): Partial<OnboardingProgress> | null {
    try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        return raw ? (JSON.parse(raw) as Partial<OnboardingProgress>) : null;
    } catch {
        return null;
    }
}

/**
 * First-run guided setup. Walks a brand-new user from an empty install to a
 * populated, configured dashboard - preferences -> household -> first asset ->
 * first value - reusing the existing settings/portfolio hooks. Supports going
 * back to edit earlier steps, and resumes where it left off after a reload.
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

    // Restore any saved progress once on mount.
    const [saved] = useState(loadProgress);

    const [step, setStep] = useState<Step>(saved?.step ?? 'welcome');
    const [submitting, setSubmitting] = useState(false);

    const [personName, setPersonName] = useState(saved?.personName ?? 'Me');
    const [createdPersons, setCreatedPersons] = useState<Person[]>(saved?.createdPersons ?? []);
    const [createdAsset, setCreatedAsset] = useState<Asset | null>(saved?.createdAsset ?? null);
    const [ownerId, setOwnerId] = useState(saved?.ownerId ?? '');
    const [assetName, setAssetName] = useState(saved?.assetName ?? '');
    const [category, setCategory] = useState<AssetCategory>(
        saved?.category ?? categories[0]?.key ?? 'stocks'
    );
    const [value, setValue] = useState(saved?.value ?? '');
    const [invested, setInvested] = useState(saved?.invested ?? '');
    const [date, setDate] = useState(saved?.date ?? new Date().toISOString().split('T')[0]);

    // Persist progress whenever it changes (but not the terminal "done" step).
    useEffect(() => {
        if (!isOpen || step === 'done') return;
        const progress: OnboardingProgress = {
            step,
            personName,
            createdPersons,
            createdAsset,
            ownerId,
            assetName,
            category,
            value,
            invested,
            date,
        };
        try {
            localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
        } catch {
            /* ignore storage quota errors */
        }
    }, [
        isOpen,
        step,
        personName,
        createdPersons,
        createdAsset,
        ownerId,
        assetName,
        category,
        value,
        invested,
        date,
    ]);

    if (!isOpen) return null;

    const stepNumber = STEP_ORDER.indexOf(step) + 1;

    // Live profit/loss for the value step (first snapshot starts from a 0 basis).
    const currentValueNum = parseValue(value);
    const investedNum = invested.trim() === '' ? currentValueNum : parseValue(invested);
    let gain = currentValueNum - investedNum;
    if (Math.abs(gain) < 0.0001) gain = 0;
    const gainPercent = investedNum > 0 ? (gain / investedNum) * 100 : 0;

    const goBack = () => {
        const idx = FLOW.indexOf(step);
        if (idx > 0) setStep(FLOW[idx - 1]);
    };

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

    // The asset is not created until "Finish" so the user can step back and edit
    // the name/category/owner without creating duplicates.
    const handleAssetContinue = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetName.trim()) return;
        setStep('value');
    };

    const handleFinish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!value || submitting) return;
        const finalOwnerId = ownerId || createdPersons[0]?.id;
        if (!finalOwnerId || !assetName.trim()) return;

        setSubmitting(true);
        try {
            // Reuse an asset created on a previous (failed) finish attempt so a
            // retry - even after a reload - never creates a duplicate.
            let asset: Asset | null = createdAsset;
            if (!asset) {
                const created = await addAsset({
                    name: assetName.trim(),
                    category,
                    ownerId: finalOwnerId,
                    purchaseDate: new Date().toISOString().split('T')[0],
                    purchaseAmount: 0,
                    currentValue: 0,
                });
                if (!created) {
                    setSubmitting(false);
                    return;
                }
                asset = created;
                setCreatedAsset(created);
            }
            // investmentChange records how much was put in, so the asset shows
            // real profit/loss from day one (value - invested).
            await ApiClient.addSnapshot(asset.id, {
                value: currentValueNum,
                date: new Date(date).toISOString(),
                investmentChange: investedNum,
                notes: '',
            });
            onComplete();
            setStep('done');
        } catch (error) {
            console.error('Failed to finish onboarding:', error);
            toast.error('Failed to save your asset');
        } finally {
            setSubmitting(false);
        }
    };

    const backButton = (
        <button
            type="button"
            className="btn-secondary"
            onClick={goBack}
            data-testid="onboarding-back"
        >
            Back
        </button>
    );

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
                            {backButton}
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
                            <ul
                                className="onboarding-person-list"
                                data-testid="onboarding-person-list"
                            >
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
                            {backButton}
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
                    <form className="modal-body" onSubmit={handleAssetContinue}>
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
                            {backButton}
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={!assetName.trim()}
                                data-testid="onboarding-asset-submit"
                            >
                                Continue
                            </button>
                        </div>
                    </form>
                )}

                {step === 'value' && (
                    <form className="modal-body" onSubmit={handleFinish}>
                        <p className="empty-text onboarding-step-intro">
                            What&apos;s <strong>{assetName}</strong> worth today, and how much did you
                            put in? We&apos;ll show whether it&apos;s in profit.
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
                            <label className="form-label">Current value</label>
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
                        <div className="form-group">
                            <label className="form-label">Amount invested</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="form-input"
                                value={invested}
                                onChange={e => handleNumberInput(e.target.value, setInvested)}
                                placeholder="How much you put in"
                                data-testid="onboarding-invested-input"
                            />
                            <small className="form-hint">
                                Leave blank if it&apos;s the same as the current value (no profit
                                yet).
                            </small>
                        </div>
                        {value && (
                            <div
                                className={`value-change-indicator ${
                                    gain > 0 ? 'positive' : gain < 0 ? 'negative' : 'neutral'
                                }`}
                                data-testid="onboarding-profit-preview"
                            >
                                {gain === 0 ? (
                                    'No profit yet'
                                ) : (
                                    <>
                                        {gain > 0 ? 'Profit: +' : 'Loss: '}
                                        {formatCurrency(Math.abs(gain), currency, 2)}
                                        {` (${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%)`}
                                    </>
                                )}
                            </div>
                        )}
                        <div className="modal-actions">
                            {backButton}
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
                                {assetName} is on your dashboard. Use the <strong>+</strong> button
                                anytime to record new values or add more assets.
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
