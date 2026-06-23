import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PortfolioHeatmap from '../../components/PortfolioHeatmap';
import type { Asset, Person, ValueEntry } from '../../types';

// PortfolioHeatmap pulls in app-wide contexts, the router, and responsive hooks.
// Stub them so the test exercises the heatmap computation/render in isolation
// on a desktop (grid) layout.
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}));

vi.mock('../../hooks/useMediaQuery', () => ({
    useIsMobile: () => false,
    useIsTouchDevice: () => false,
}));

vi.mock('../../contexts/PrivacyContext', () => ({
    usePrivacy: () => ({
        isHidden: false,
        togglePrivacy: vi.fn(),
        formatAmount: (v: number) => `$${v}`,
    }),
}));

vi.mock('../../contexts/SettingsContext', () => ({
    useSettings: () => ({
        defaultFilter: 'all',
        currency: 'USD',
        formatAmount: (v: number) => `$${v}`,
        isLoading: false,
    }),
}));

const PERSON: Person = { id: 'p1', name: 'Me' };

function asset(name: string, history: ValueEntry[]): Asset {
    return {
        id: name,
        name,
        category: 'etf',
        ownerId: PERSON.id,
        purchaseDate: history[0]?.date ?? '2024-01-01',
        purchaseAmount: history[0]?.investmentChange ?? 0,
        currentValue: history[history.length - 1]?.value ?? 0,
        valueHistory: history,
    };
}

// Returns the .heatmap-cell elements (one per visible month) for a named row.
function monthCells(rowName: string): HTMLElement[] {
    const nameEl = screen.getByText(rowName);
    const row = nameEl.closest('.heatmap-row') as HTMLElement;
    return Array.from(row.querySelectorAll<HTMLElement>('.heatmap-cell'));
}

// Returns the total (range) cell text for a named row.
function totalCellText(rowName: string): string {
    const nameEl = screen.getByText(rowName);
    const row = nameEl.closest('.heatmap-row') as HTMLElement;
    return row.querySelector<HTMLElement>('.heatmap-cell-total')!.textContent!.trim();
}

function cellChange(cell: HTMLElement): string {
    return cell.querySelector<HTMLElement>('.cell-change')?.textContent?.trim() ?? '';
}

function cellValue(cell: HTMLElement): string {
    return cell.querySelector<HTMLElement>('.cell-value')?.textContent?.trim() ?? '';
}

describe('PortfolioHeatmap TOTAL PORTFOLIO row', () => {
    // Two assets that enter the portfolio on staggered months.
    //
    //              2024-01      2024-02      2024-03
    //   Alpha   10000 (+10k)  11000        12000
    //   Beta         -        5000 (+5k)   6000
    //
    // Per-asset cell currency changes:
    //   Alpha:   inception     +1000        +1000   (total +2000 on 10000 basis = +20%)
    //   Beta:       -          inception    +1000   (total +1000 on  5000 basis = +20%)
    //
    // The TOTAL PORTFOLIO row must be the column-wise aggregation of those cells:
    //   value:   10000        16000        18000
    //   change:      0        +1000        +2000   (total +3000 on 15000 basis = +20%)
    const assets: Asset[] = [
        asset('Alpha', [
            { date: '2024-01-15', value: 10000, investmentChange: 10000 },
            { date: '2024-02-15', value: 11000, investmentChange: 0 },
            { date: '2024-03-15', value: 12000, investmentChange: 0 },
        ]),
        asset('Beta', [
            { date: '2024-02-15', value: 5000, investmentChange: 5000 },
            { date: '2024-03-15', value: 6000, investmentChange: 0 },
        ]),
    ];

    it('range total equals the sum of the per-asset range totals', async () => {
        render(<PortfolioHeatmap assets={assets} persons={[PERSON]} />);
        await userEvent.click(screen.getByRole('button', { name: 'Value' }));

        const parse = (t: string) => parseInt(t.replace(/[^0-9-]/g, ''), 10);
        const alpha = parse(totalCellText('Alpha'));
        const beta = parse(totalCellText('Beta'));
        const portfolio = parse(totalCellText('TOTAL PORTFOLIO'));

        expect(alpha).toBe(2000);
        expect(beta).toBe(1000);
        expect(portfolio).toBe(alpha + beta);
        expect(portfolio).toBe(3000);
    });

    it('final-month value and change equal the column sum of the per-asset cells', async () => {
        render(<PortfolioHeatmap assets={assets} persons={[PERSON]} />);
        await userEvent.click(screen.getByRole('button', { name: 'Value' }));

        // index 2 == 2024-03, the only month where both assets show a numeric cell
        const alpha = monthCells('Alpha')[2];
        const beta = monthCells('Beta')[2];
        const portfolio = monthCells('TOTAL PORTFOLIO')[2];

        expect(cellValue(alpha)).toBe('12.0k');
        expect(cellValue(beta)).toBe('6.0k');
        expect(cellValue(portfolio)).toBe('18.0k'); // 12.0k + 6.0k

        expect(cellChange(alpha)).toBe('+1.00k');
        expect(cellChange(beta)).toBe('+1.00k');
        expect(cellChange(portfolio)).toBe('+2.00k'); // +1.00k + +1.00k
    });

    it('range-total percentage uses the >0 basis guard', () => {
        render(<PortfolioHeatmap assets={assets} persons={[PERSON]} />);
        // +3000 change on a 15000 basis (0 start + 15000 flow) = +20.0%
        expect(totalCellText('TOTAL PORTFOLIO')).toBe('+20.0%');
    });
});

describe('PortfolioHeatmap negative-basis guard', () => {
    it('shows 0% for a month whose previousValue + investmentChange is negative', () => {
        // 2024-02 basis = 1000 (prev) + (-1500) (withdrawal) = -500 (< 0).
        // Old arithmetic produced a sign-flipped 700 / -500 = -140%; the
        // subPeriodReturn guard must report 0% instead.
        const assets: Asset[] = [
            asset('Solo', [
                { date: '2024-01-15', value: 1000, investmentChange: 1000 },
                { date: '2024-02-15', value: 200, investmentChange: -1500 },
            ]),
        ];
        render(<PortfolioHeatmap assets={assets} persons={[PERSON]} />);

        const febCell = monthCells('Solo')[1]; // 2024-02
        expect(cellChange(febCell)).toBe('0.0%');
    });
});
