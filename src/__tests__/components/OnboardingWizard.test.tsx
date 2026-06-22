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

        // Person step (name pre-filled with "Me")
        fireEvent.click(screen.getByTestId('onboarding-person-submit'));
        await waitFor(() => expect(props.addPerson).toHaveBeenCalledWith('Me'));

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

        fireEvent.click(screen.getByTestId('onboarding-person-submit'));

        await waitFor(() => expect(props.addPerson).toHaveBeenCalled());
        expect(props.addAsset).not.toHaveBeenCalled();
        expect(addSnapshotMock).not.toHaveBeenCalled();
        // Still on the person step
        expect(screen.getByTestId('onboarding-person-input')).toBeInTheDocument();
    });
});
