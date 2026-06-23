import type { Asset, PortfolioStats } from '../types';

/**
 * Aggregate a set of assets into the portfolio rollup: Total Worth
 * (sum of currentValue), Invested Capital (sum of purchaseAmount), Gain/Loss,
 * and the per-category / per-owner Total Worth breakdowns.
 *
 * Pure and side-effect-free - the same rollup the dashboard reads. gainPercentage
 * is guarded to 0% when Invested Capital is non-positive, consistent with the
 * basis guard in subPeriodReturn.
 */
export function computePortfolioStats(assets: Asset[]): PortfolioStats {
    const stats: PortfolioStats = {
        totalValue: 0,
        totalInvested: 0,
        totalGain: 0,
        gainPercentage: 0,
        byCategory: {},
        byOwner: {},
    };

    assets.forEach(asset => {
        stats.totalValue += asset.currentValue;
        stats.totalInvested += asset.purchaseAmount;

        // Handle dynamic categories
        if (typeof stats.byCategory[asset.category] !== 'number') {
            stats.byCategory[asset.category] = 0;
        }
        stats.byCategory[asset.category] += asset.currentValue;

        if (!stats.byOwner[asset.ownerId]) {
            stats.byOwner[asset.ownerId] = 0;
        }
        stats.byOwner[asset.ownerId] += asset.currentValue;
    });

    stats.totalGain = stats.totalValue - stats.totalInvested;
    stats.gainPercentage =
        stats.totalInvested > 0 ? (stats.totalGain / stats.totalInvested) * 100 : 0;

    return stats;
}
