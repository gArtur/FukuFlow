import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AddSnapshotModal from '../../components/AddSnapshotModal';
import type { Asset, Person } from '../../types';

// AddSnapshotModal only consumes `currency` from SettingsContext for formatting.
// Stub it so the test exercises the modal's focus behavior in isolation.
vi.mock('../../contexts/SettingsContext', () => ({
    useSettings: () => ({ currency: 'USD' }),
}));

const PERSON: Person = { id: 'p1', name: 'Me' };

function makeAsset(over: Partial<Asset> = {}): Asset {
    return {
        id: 'a1',
        name: 'Vanguard ETF',
        category: 'etf',
        ownerId: PERSON.id,
        purchaseDate: '2024-01-01',
        purchaseAmount: 1000,
        currentValue: 1200,
        valueHistory: [],
        ...over,
    };
}

describe('AddSnapshotModal', () => {
    it('focuses the Current Value input when opened for a specific asset', () => {
        render(
            <AddSnapshotModal
                isOpen
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                asset={makeAsset()}
                persons={[PERSON]}
            />
        );

        expect(screen.getByTestId('snapshot-value')).toHaveFocus();
    });

    it('does not auto-focus the Current Value input in global mode (asset picker)', () => {
        render(
            <AddSnapshotModal
                isOpen
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                asset={null}
                assets={[makeAsset()]}
                persons={[PERSON]}
            />
        );

        expect(screen.getByTestId('snapshot-value')).not.toHaveFocus();
    });
});
