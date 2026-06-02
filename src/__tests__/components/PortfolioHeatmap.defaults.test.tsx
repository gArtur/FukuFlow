import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PortfolioHeatmap from '../../components/PortfolioHeatmap';
import type { Asset, Person, ValueEntry } from '../../types';

// PortfolioHeatmap pulls in app-wide contexts, the router, and responsive hooks.
// Stub them so the test exercises the heatmap on a desktop (grid) layout.
// Unlike PortfolioHeatmap.test.tsx, the settings mock here is *configurable*
// per-test so we can vary `defaultDateRange`.
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}));

vi.mock('../../hooks/useMediaQuery', () => ({
    useIsMobile: () => false,
    useIsTouchDevice: () => false,
}));

vi.mock('../../contexts/PrivacyContext', () => ({
    usePrivacy: () => ({ isHidden: false, togglePrivacy: vi.fn() }),
}));

const settingsMock = vi.hoisted(() => ({
    current: {
        defaultFilter: 'all',
        currency: 'USD',
        formatAmount: (v: number) => `$${v}`,
        isLoading: false,
        defaultDateRange: undefined as string | undefined,
    },
}));

vi.mock('../../contexts/SettingsContext', () => ({
    useSettings: () => settingsMock.current,
}));

const PERSON: Person = { id: 'p1', name: 'Me' };

function setSettings(overrides: Partial<typeof settingsMock.current>) {
    settingsMock.current = {
        defaultFilter: 'all',
        currency: 'USD',
        formatAmount: (v: number) => `$${v}`,
        isLoading: false,
        defaultDateRange: undefined,
        ...overrides,
    };
}

// Build one asset with `count` monthly snapshots ending at the current month,
// so quick-filter ranges (which are anchored to "now") are deterministic by
// construction regardless of the calendar date the test runs on.
function assetSpanningMonthsBack(count: number): Asset {
    const now = new Date();
    const history: ValueEntry[] = [];
    for (let i = count; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`;
        history.push({
            date,
            value: 10000 + (count - i) * 100,
            investmentChange: i === count ? 10000 : 0,
        });
    }
    return {
        id: 'A',
        name: 'Alpha',
        category: 'etf',
        ownerId: PERSON.id,
        purchaseDate: history[0].date,
        purchaseAmount: 10000,
        currentValue: history[history.length - 1].value,
        valueHistory: history,
    };
}

function monthColumnCount(): number {
    return document.querySelectorAll('.heatmap-month-header .heatmap-month').length;
}

function quickFilterButton(name: 'YTD' | '1Y' | '5Y' | 'MAX'): HTMLElement {
    return screen.getByRole('button', { name });
}

describe('PortfolioHeatmap default date range', () => {
    it('opens scoped to the configured default range (1Y), not full history', () => {
        // 37 months of data → MAX shows 37 columns; 1Y shows 13 (now-12 .. now).
        setSettings({ defaultDateRange: '1Y' });
        render(<PortfolioHeatmap assets={[assetSpanningMonthsBack(36)]} persons={[PERSON]} />);

        expect(quickFilterButton('1Y').className).toContain('active');
        expect(quickFilterButton('MAX').className).not.toContain('active');
        expect(monthColumnCount()).toBe(13);
    });

    it('opens at full history (MAX) when no default range is configured', () => {
        setSettings({ defaultDateRange: undefined });
        render(<PortfolioHeatmap assets={[assetSpanningMonthsBack(36)]} persons={[PERSON]} />);

        expect(quickFilterButton('MAX').className).toContain('active');
        expect(quickFilterButton('1Y').className).not.toContain('active');
        expect(monthColumnCount()).toBe(37);
    });

    it('opens at full history when the default range is MAX', () => {
        setSettings({ defaultDateRange: 'MAX' });
        render(<PortfolioHeatmap assets={[assetSpanningMonthsBack(36)]} persons={[PERSON]} />);

        expect(quickFilterButton('MAX').className).toContain('active');
        expect(monthColumnCount()).toBe(37);
    });
});

describe('PortfolioHeatmap initial scroll', () => {
    // jsdom performs no layout, so scrollWidth is 0 and scrollLeft is inert.
    // Stub scrollWidth on the prototype and record every scrollLeft assignment
    // so we can assert the grid was driven to its far right on open.
    const STUB_SCROLL_WIDTH = 1500;
    const originalScrollWidth = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        'scrollWidth'
    );
    const originalScrollLeft = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollLeft');
    let scrollLeftSets: number[] = [];

    beforeEach(() => {
        scrollLeftSets = [];
        Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
            configurable: true,
            get() {
                return STUB_SCROLL_WIDTH;
            },
        });
        Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
            configurable: true,
            get() {
                return 0;
            },
            set(v: number) {
                scrollLeftSets.push(v);
            },
        });
    });

    afterEach(() => {
        if (originalScrollWidth) {
            Object.defineProperty(HTMLElement.prototype, 'scrollWidth', originalScrollWidth);
        }
        if (originalScrollLeft) {
            Object.defineProperty(HTMLElement.prototype, 'scrollLeft', originalScrollLeft);
        }
    });

    it('scrolls the grid to the latest (rightmost) month on open', () => {
        setSettings({ defaultDateRange: 'MAX' });
        render(<PortfolioHeatmap assets={[assetSpanningMonthsBack(36)]} persons={[PERSON]} />);

        expect(scrollLeftSets).toContain(STUB_SCROLL_WIDTH);
    });

    it('re-scrolls the grid to the latest month when the time range changes', async () => {
        setSettings({ defaultDateRange: 'MAX' });
        render(<PortfolioHeatmap assets={[assetSpanningMonthsBack(36)]} persons={[PERSON]} />);

        scrollLeftSets.length = 0; // ignore the initial-open scroll
        await userEvent.click(quickFilterButton('1Y'));

        expect(scrollLeftSets).toContain(STUB_SCROLL_WIDTH);
    });
});
