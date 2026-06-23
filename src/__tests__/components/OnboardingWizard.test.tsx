import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingWizard from '../../components/OnboardingWizard';
import type { Asset, Person } from '../../types';

// The wizard reads categories + currency/theme from SettingsContext. Stub it so the
// component is exercised in isolation (the real provider hits the API).
vi.mock('../../contexts/SettingsContext', () => ({
    useSettings: () => ({
        categories: [
            { key: 'stocks', label: 'Stocks' },
            { key: 'crypto', label: 'Crypto' },
        ],
        currency: 'USD',
        setCurrency: vi.fn(),
        theme: 'dark',
        setTheme: vi.fn(),
    }),
}));

const { addSnapshotMock } = vi.hoisted(() => ({ addSnapshotMock: vi.fn() }));
vi.mock('../../lib/apiClient', () => ({
    ApiClient: { addSnapshot: addSnapshotMock },
}));

function makeAsset(over: Partial<Asset> = {}): Asset {
    return {
        id: 'a1',
        name: 'Apple Stock',
        category: 'stocks',
        ownerId: 'p1',
        purchaseDate: '2026-06-22',
        purchaseAmount: 0,
        currentValue: 0,
        valueHistory: [],
        ...over,
    };
}

const addPersonSpy = vi.fn();
const deletePersonSpy = vi.fn();
const onCloseSpy = vi.fn();
const onCompleteSpy = vi.fn();
const addAssetSpy = vi.fn();

// Stateful wrapper that mirrors how App wires the wizard: people live outside
// the wizard (in the DB / usePersons) and arrive via the `persons` prop, which
// updates when addPerson/deletePerson run.
function Harness({
    initialPersons = [],
    failAddPerson = false,
}: {
    initialPersons?: Person[];
    failAddPerson?: boolean;
}) {
    const [persons, setPersons] = useState<Person[]>(initialPersons);
    const addPerson = async (name: string) => {
        addPersonSpy(name);
        if (failAddPerson) return undefined;
        const p: Person = { id: `p${persons.length + 1}`, name };
        setPersons(prev => [...prev, p]);
        return p;
    };
    const deletePerson = async (id: string) => {
        deletePersonSpy(id);
        setPersons(prev => prev.filter(p => p.id !== id));
        return true;
    };
    return (
        <OnboardingWizard
            isOpen
            onClose={onCloseSpy}
            onComplete={onCompleteSpy}
            persons={persons}
            addPerson={addPerson}
            addAsset={addAssetSpy}
            deletePerson={deletePerson}
        />
    );
}

function renderWizard(opts: { initialPersons?: Person[]; failAddPerson?: boolean } = {}) {
    render(<Harness {...opts} />);
}

// Advance welcome -> preferences -> person step.
function gotoPersonStep() {
    fireEvent.click(screen.getByTestId('onboarding-get-started'));
    fireEvent.click(screen.getByText('Continue')); // preferences -> person
}

// Add the default "Me", continue, name the asset, continue -> land on value step.
async function goToValueStep(assetName = 'Apple Stock') {
    gotoPersonStep();
    fireEvent.click(screen.getByTestId('onboarding-person-add'));
    await screen.findByText('Me');
    fireEvent.click(screen.getByTestId('onboarding-person-submit'));
    await screen.findByTestId('onboarding-asset-name-input');
    fireEvent.change(screen.getByTestId('onboarding-asset-name-input'), {
        target: { value: assetName },
    });
    fireEvent.click(screen.getByTestId('onboarding-asset-submit'));
    await screen.findByTestId('onboarding-value-input');
}

describe('OnboardingWizard', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        addAssetSpy.mockResolvedValue(makeAsset());
        addSnapshotMock.mockResolvedValue(undefined);
    });

    it('renders the welcome step when open and nothing when closed', () => {
        const { rerender } = render(
            <OnboardingWizard
                isOpen={false}
                onClose={vi.fn()}
                onComplete={vi.fn()}
                persons={[]}
                addPerson={vi.fn()}
                addAsset={vi.fn()}
            />
        );
        expect(screen.queryByTestId('onboarding-wizard')).toBeNull();

        rerender(
            <OnboardingWizard
                isOpen
                onClose={vi.fn()}
                onComplete={vi.fn()}
                persons={[]}
                addPerson={vi.fn()}
                addAsset={vi.fn()}
            />
        );
        expect(screen.getByTestId('onboarding-get-started')).toBeInTheDocument();
    });

    it('shows people that already exist when onboarding is reopened', () => {
        renderWizard({
            initialPersons: [
                { id: 'p1', name: 'Me' },
                { id: 'p2', name: 'Spouse' },
            ],
        });
        gotoPersonStep();

        // The household step reflects the people already in the database.
        expect(screen.getByText('Me')).toBeInTheDocument();
        expect(screen.getByText('Spouse')).toBeInTheDocument();
        // ...and the user can continue without re-adding anyone.
        expect(screen.getByTestId('onboarding-person-submit')).toBeEnabled();
    });

    it('chains household -> asset -> value, creating the asset only on finish', async () => {
        renderWizard();
        await goToValueStep('Apple Stock');

        // Asset is not created until finish (so Back can edit it safely).
        expect(addAssetSpy).not.toHaveBeenCalled();

        fireEvent.change(screen.getByTestId('onboarding-value-input'), {
            target: { value: '5000' },
        });
        fireEvent.click(screen.getByTestId('onboarding-value-submit'));

        await waitFor(() =>
            expect(addAssetSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Apple Stock',
                    category: 'stocks',
                    ownerId: 'p1',
                    purchaseAmount: 0,
                    currentValue: 0,
                })
            )
        );
        // Invested left blank defaults to the value (no spurious gain).
        await waitFor(() =>
            expect(addSnapshotMock).toHaveBeenCalledWith(
                'a1',
                expect.objectContaining({ value: 5000, investmentChange: 5000 })
            )
        );
        expect(onCompleteSpy).toHaveBeenCalled();
        expect(await screen.findByTestId('onboarding-done')).toBeInTheDocument();
    });

    it('records the amount invested so the snapshot captures profit', async () => {
        renderWizard();
        await goToValueStep();

        fireEvent.change(screen.getByTestId('onboarding-value-input'), {
            target: { value: '1200' },
        });
        fireEvent.change(screen.getByTestId('onboarding-invested-input'), {
            target: { value: '1000' },
        });
        expect(screen.getByTestId('onboarding-profit-preview')).toHaveTextContent('Profit');

        fireEvent.click(screen.getByTestId('onboarding-value-submit'));
        await waitFor(() =>
            expect(addSnapshotMock).toHaveBeenCalledWith(
                'a1',
                expect.objectContaining({ value: 1200, investmentChange: 1000 })
            )
        );
    });

    it('lets the user go back to edit a previous step', () => {
        renderWizard();
        fireEvent.click(screen.getByTestId('onboarding-get-started')); // -> preferences
        expect(screen.getByTestId('onboarding-currency-select')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Continue')); // -> person
        expect(screen.getByTestId('onboarding-person-input')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('onboarding-back')); // -> preferences
        expect(screen.getByTestId('onboarding-currency-select')).toBeInTheDocument();
    });

    it('resumes from saved progress after a reload', () => {
        localStorage.setItem(
            'onboardingProgress',
            JSON.stringify({
                step: 'value',
                personName: '',
                createdAsset: null,
                ownerId: 'p1',
                assetName: 'Apple Stock',
                category: 'stocks',
                value: '5000',
                invested: '',
                date: '2026-06-01',
            })
        );
        renderWizard({ initialPersons: [{ id: 'p1', name: 'Me' }] });

        // Wizard opens straight on the value step with the saved details.
        const valueInput = screen.getByTestId('onboarding-value-input') as HTMLInputElement;
        expect(valueInput.value).toBe('5000');
        expect(screen.getByText(/Apple Stock/)).toBeInTheDocument();
    });

    it('calls onClose when the user skips', () => {
        renderWizard();
        fireEvent.click(screen.getByTestId('onboarding-skip'));
        expect(onCloseSpy).toHaveBeenCalled();
    });

    it('stays on the person step when adding a person fails', async () => {
        renderWizard({ failAddPerson: true });
        gotoPersonStep();

        fireEvent.click(screen.getByTestId('onboarding-person-add'));

        await waitFor(() => expect(addPersonSpy).toHaveBeenCalled());
        expect(addAssetSpy).not.toHaveBeenCalled();
        expect(addSnapshotMock).not.toHaveBeenCalled();
        // No person was added, so Continue is disabled and we stay on the person step.
        expect(screen.getByTestId('onboarding-person-input')).toBeInTheDocument();
        expect(screen.getByTestId('onboarding-person-submit')).toBeDisabled();
    });

    it('supports adding multiple people and choosing the asset owner', async () => {
        renderWizard();
        gotoPersonStep();

        // Add "Me" (pre-filled), then "Spouse".
        fireEvent.click(screen.getByTestId('onboarding-person-add'));
        await screen.findByText('Me');
        fireEvent.change(screen.getByTestId('onboarding-person-input'), {
            target: { value: 'Spouse' },
        });
        fireEvent.click(screen.getByTestId('onboarding-person-add'));
        await screen.findByText('Spouse');
        expect(addPersonSpy).toHaveBeenCalledTimes(2);

        // Continue -> asset step shows an owner selector listing both people.
        fireEvent.click(screen.getByTestId('onboarding-person-submit'));
        const ownerSelect = await screen.findByTestId('onboarding-asset-owner-select');
        fireEvent.change(ownerSelect, { target: { value: 'p2' } });

        fireEvent.change(screen.getByTestId('onboarding-asset-name-input'), {
            target: { value: 'Condo' },
        });
        fireEvent.click(screen.getByTestId('onboarding-asset-submit'));

        // Asset is created on finish, with the chosen owner.
        await screen.findByTestId('onboarding-value-input');
        fireEvent.change(screen.getByTestId('onboarding-value-input'), {
            target: { value: '300000' },
        });
        fireEvent.click(screen.getByTestId('onboarding-value-submit'));
        await waitFor(() =>
            expect(addAssetSpy).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Condo', ownerId: 'p2' })
            )
        );
    });
});
