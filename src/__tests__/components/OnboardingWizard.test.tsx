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

const PERSON: Person = { id: 'p1', name: 'Me' };

function makeAsset(over: Partial<Asset> = {}): Asset {
    return {
        id: 'a1',
        name: 'Apple Stock',
        category: 'stocks',
        ownerId: PERSON.id,
        purchaseDate: '2026-06-22',
        purchaseAmount: 0,
        currentValue: 0,
        valueHistory: [],
        ...over,
    };
}

function setup(overrides: Partial<React.ComponentProps<typeof OnboardingWizard>> = {}) {
    const props = {
        isOpen: true,
        onClose: vi.fn(),
        onComplete: vi.fn(),
        addPerson: vi.fn().mockResolvedValue(PERSON),
        addAsset: vi.fn().mockResolvedValue(makeAsset()),
        deletePerson: vi.fn().mockResolvedValue(true),
        ...overrides,
    };
    render(<OnboardingWizard {...props} />);
    return props;
}

// Advance welcome -> preferences -> person step.
function gotoPersonStep() {
    fireEvent.click(screen.getByTestId('onboarding-get-started'));
    fireEvent.click(screen.getByText('Continue')); // preferences -> person
}

describe('OnboardingWizard', () => {
    beforeEach(() => {
        addSnapshotMock.mockReset();
        addSnapshotMock.mockResolvedValue(undefined);
    });

    it('renders the welcome step when open and nothing when closed', () => {
        const { rerender } = render(
            <OnboardingWizard
                isOpen={false}
                onClose={vi.fn()}
                onComplete={vi.fn()}
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
                addPerson={vi.fn()}
                addAsset={vi.fn()}
            />
        );
        expect(screen.getByTestId('onboarding-get-started')).toBeInTheDocument();
    });

    it('chains person -> asset -> first value and finishes', async () => {
        const props = setup();
        gotoPersonStep();

        // Person step: add the pre-filled person "Me", then continue.
        fireEvent.click(screen.getByTestId('onboarding-person-add'));
        await waitFor(() => expect(props.addPerson).toHaveBeenCalledWith('Me'));
        await screen.findByText('Me'); // chip appears once state updates
        fireEvent.click(screen.getByTestId('onboarding-person-submit'));

        // Asset step
        await screen.findByTestId('onboarding-asset-name-input');
        fireEvent.change(screen.getByTestId('onboarding-asset-name-input'), {
            target: { value: 'Apple Stock' },
        });
        fireEvent.click(screen.getByTestId('onboarding-asset-submit'));
        await waitFor(() =>
            expect(props.addAsset).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Apple Stock',
                    category: 'stocks',
                    ownerId: 'p1',
                    purchaseAmount: 0,
                    currentValue: 0,
                })
            )
        );

        // Value step
        await screen.findByTestId('onboarding-value-input');
        fireEvent.change(screen.getByTestId('onboarding-value-input'), {
            target: { value: '5000' },
        });
        fireEvent.click(screen.getByTestId('onboarding-value-submit'));

        await waitFor(() =>
            expect(addSnapshotMock).toHaveBeenCalledWith(
                'a1',
                expect.objectContaining({ value: 5000, investmentChange: 5000 })
            )
        );
        expect(props.onComplete).toHaveBeenCalled();
        expect(await screen.findByTestId('onboarding-done')).toBeInTheDocument();
    });

    it('calls onClose when the user skips', () => {
        const props = setup();
        fireEvent.click(screen.getByTestId('onboarding-skip'));
        expect(props.onClose).toHaveBeenCalled();
    });

    it('stays on the person step when adding a person fails', async () => {
        const props = setup({ addPerson: vi.fn().mockResolvedValue(undefined) });
        gotoPersonStep();

        fireEvent.click(screen.getByTestId('onboarding-person-add'));

        await waitFor(() => expect(props.addPerson).toHaveBeenCalled());
        expect(props.addAsset).not.toHaveBeenCalled();
        expect(addSnapshotMock).not.toHaveBeenCalled();
        // No person was added, so Continue is disabled and we stay on the person step.
        expect(screen.getByTestId('onboarding-person-input')).toBeInTheDocument();
        expect(screen.getByTestId('onboarding-person-submit')).toBeDisabled();
    });

    it('supports adding multiple people and choosing the asset owner', async () => {
        const me: Person = { id: 'p1', name: 'Me' };
        const spouse: Person = { id: 'p2', name: 'Spouse' };
        const addPerson = vi.fn().mockResolvedValueOnce(me).mockResolvedValueOnce(spouse);
        const props = setup({ addPerson });
        gotoPersonStep();

        // Add "Me" (pre-filled), then "Spouse".
        fireEvent.click(screen.getByTestId('onboarding-person-add'));
        await screen.findByText('Me');
        fireEvent.change(screen.getByTestId('onboarding-person-input'), {
            target: { value: 'Spouse' },
        });
        fireEvent.click(screen.getByTestId('onboarding-person-add'));
        await screen.findByText('Spouse');
        expect(addPerson).toHaveBeenCalledTimes(2);

        // Continue -> asset step shows an owner selector listing both people.
        fireEvent.click(screen.getByTestId('onboarding-person-submit'));
        const ownerSelect = await screen.findByTestId('onboarding-asset-owner-select');
        fireEvent.change(ownerSelect, { target: { value: 'p2' } });

        fireEvent.change(screen.getByTestId('onboarding-asset-name-input'), {
            target: { value: 'Condo' },
        });
        fireEvent.click(screen.getByTestId('onboarding-asset-submit'));
        await waitFor(() =>
            expect(props.addAsset).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Condo', ownerId: 'p2' })
            )
        );
    });
});
