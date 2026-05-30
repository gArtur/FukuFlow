import { describe, it, expect } from 'vitest';
import { computePortfolioStats } from '../../utils/portfolioStats';
import type { Asset } from '../../types';

function makeAsset(overrides: Partial<Asset> = {}): Asset {
    return {
        id: 'a1',
        name: 'Test Asset',
        category: 'etf',
        ownerId: 'p1',
        purchaseAmount: 1000,
        purchaseDate: '2024-01-01',
        currentValue: 1200,
        valueHistory: [],
        ...overrides,
    };
}

describe('computePortfolioStats', () => {
    it('returns all-zero stats for an empty portfolio', () => {
        const stats = computePortfolioStats([]);
        expect(stats).toEqual({
            totalValue: 0,
            totalInvested: 0,
            totalGain: 0,
            gainPercentage: 0,
            byCategory: {},
            byOwner: {},
        });
    });

    it('sums Total Worth and Invested Capital for a single asset', () => {
        const stats = computePortfolioStats([
            makeAsset({ currentValue: 1200, purchaseAmount: 1000 }),
        ]);
        expect(stats.totalValue).toBe(1200);
        expect(stats.totalInvested).toBe(1000);
        expect(stats.totalGain).toBe(200);
        expect(stats.gainPercentage).toBeCloseTo(20);
    });

    it('aggregates Total Worth and Invested Capital across multiple assets', () => {
        const stats = computePortfolioStats([
            makeAsset({ id: 'a1', currentValue: 1200, purchaseAmount: 1000 }),
            makeAsset({ id: 'a2', currentValue: 800, purchaseAmount: 1000 }),
        ]);
        expect(stats.totalValue).toBe(2000);
        expect(stats.totalInvested).toBe(2000);
        expect(stats.totalGain).toBe(0);
        expect(stats.gainPercentage).toBe(0);
    });

    it('breaks Total Worth down by category', () => {
        const stats = computePortfolioStats([
            makeAsset({ id: 'a1', category: 'etf', currentValue: 1200 }),
            makeAsset({ id: 'a2', category: 'etf', currentValue: 300 }),
            makeAsset({ id: 'a3', category: 'crypto', currentValue: 500 }),
        ]);
        expect(stats.byCategory).toEqual({ etf: 1500, crypto: 500 });
    });

    it('breaks Total Worth down by owner', () => {
        const stats = computePortfolioStats([
            makeAsset({ id: 'a1', ownerId: 'p1', currentValue: 1200 }),
            makeAsset({ id: 'a2', ownerId: 'p2', currentValue: 500 }),
            makeAsset({ id: 'a3', ownerId: 'p1', currentValue: 300 }),
        ]);
        expect(stats.byOwner).toEqual({ p1: 1500, p2: 500 });
    });

    it('reports a negative Gain/Loss when Total Worth is below Invested Capital', () => {
        const stats = computePortfolioStats([
            makeAsset({ currentValue: 800, purchaseAmount: 1000 }),
        ]);
        expect(stats.totalGain).toBe(-200);
        expect(stats.gainPercentage).toBeCloseTo(-20);
    });

    it('guards gainPercentage to 0% when Invested Capital is non-positive', () => {
        const stats = computePortfolioStats([makeAsset({ currentValue: 500, purchaseAmount: 0 })]);
        expect(stats.totalGain).toBe(500);
        expect(stats.gainPercentage).toBe(0);
    });
});
