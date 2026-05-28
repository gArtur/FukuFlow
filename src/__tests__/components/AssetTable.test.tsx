import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssetTable from '../../components/AssetTable';
import type { AssetRow } from '../../utils/assetSort';
import type { Asset } from '../../types';

function makeRow(name: string, over: Partial<AssetRow> = {}): AssetRow {
    const asset = { id: name, name } as Asset;
    return {
        asset,
        name,
        categoryLabel: 'ETFs',
        ownerName: 'Me',
        invested: 1000,
        value: 1200,
        gain: 200,
        gainPercent: 20,
        isPositive: true,
        ...over,
    };
}

function renderTable(props: Partial<React.ComponentProps<typeof AssetTable>> = {}) {
    const onSort = vi.fn();
    const onRowClick = vi.fn();
    const onAddSnapshot = vi.fn();
    render(
        <AssetTable
            rows={props.rows ?? [makeRow('Alpha'), makeRow('Beta')]}
            sortBy={props.sortBy ?? 'name'}
            sortDir={props.sortDir ?? 'asc'}
            onSort={onSort}
            onRowClick={onRowClick}
            onAddSnapshot={onAddSnapshot}
            formatAmount={props.formatAmount ?? ((v: number) => `$${v}`)}
            isHidden={props.isHidden ?? false}
        />
    );
    return { onSort, onRowClick, onAddSnapshot };
}

describe('AssetTable', () => {
    it('renders one row per asset with its name and formatted value', () => {
        renderTable({
            rows: [makeRow('Alpha', { value: 1200 }), makeRow('Beta', { value: 3400 })],
        });
        expect(screen.getAllByTestId('asset-row')).toHaveLength(2);
        expect(screen.getByText('Alpha')).toBeInTheDocument();
        expect(screen.getByText('$1200')).toBeInTheDocument();
        expect(screen.getByText('$3400')).toBeInTheDocument();
    });

    it('calls onSort with the column key when a header is clicked', async () => {
        const { onSort } = renderTable();
        await userEvent.click(screen.getByRole('button', { name: /value/i }));
        expect(onSort).toHaveBeenCalledWith('value');
    });

    it('clicking the add-snapshot action does not also trigger the row click', async () => {
        const { onAddSnapshot, onRowClick } = renderTable({ rows: [makeRow('Alpha')] });
        await userEvent.click(screen.getByRole('button', { name: /add snapshot for alpha/i }));
        expect(onAddSnapshot).toHaveBeenCalledTimes(1);
        expect(onAddSnapshot.mock.calls[0][0].name).toBe('Alpha');
        expect(onRowClick).not.toHaveBeenCalled();
    });

    it('clicking a row opens that asset', async () => {
        const { onRowClick } = renderTable({ rows: [makeRow('Alpha')] });
        await userEvent.click(screen.getByText('Alpha'));
        expect(onRowClick).toHaveBeenCalledTimes(1);
        expect(onRowClick.mock.calls[0][0].name).toBe('Alpha');
    });

    it('marks the active sort column via aria-sort', () => {
        renderTable({ sortBy: 'value', sortDir: 'desc' });
        const valueHeader = screen.getByRole('button', { name: /value/i }).closest('th');
        expect(valueHeader).toHaveAttribute('aria-sort', 'descending');
        const nameHeader = screen.getByRole('button', { name: /name/i }).closest('th');
        expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    });

    it('disables the add-snapshot action in privacy mode', async () => {
        const { onAddSnapshot } = renderTable({ rows: [makeRow('Alpha')], isHidden: true });
        const btn = screen.getByRole('button', { name: /add snapshot for alpha/i });
        expect(btn).toBeDisabled();
        await userEvent.click(btn);
        expect(onAddSnapshot).not.toHaveBeenCalled();
    });
});
