# Performance view shows money-weighted period return, rebased to the selected range

The Total Worth chart's **Performance** view plots a **Period Return**: the money-weighted (Modified-Dietz) return measured from the start of the selected time range, rebased so the first point of the range is 0%. The flat Invested Capital line is that 0% baseline, and the line ends exactly on the headline percentage shown above the chart.

## Why

- **Rebasing to the period start** answers the question a user actually asks when they pick a range - "how did my portfolio do *during this period*?" An all-time cumulative line that starts mid-air (e.g. at +40%) for a 1-year window is confusing and buries the period's movement.
- **Money-weighted (Modified-Dietz)** is the same return the app already computes for the headline figure, so the line and the big number agree - the chart is internally consistent, and every point is a genuine cumulative period return. The header is derived from this snapshot-history computation in **every** range, including MAX (it does not fall back to the asset-level cost-basis stats), so the line always lands on the headline number.

## Rejected alternatives

- **Time-weighted return (TWR):** the "truest" measure of investment skill and fully deposit-neutral, but more complex and its endpoint would not equal the headline. The heatmap's cash-flow-adjusted period returns (`monthlyReturns` in `subPeriodReturn.ts`) are the building block to revisit this if deposit-neutral performance is ever needed.
- **Naive index `(value / valueₛₜₐᵣₜ − 1)`:** ignores capital flows and double-counts deposits as returns.
- **Subtracting the start ROI (`roiₜ − roiₛₜₐᵣₜ`):** mixes two ratios with different denominators, isn't a real return, and wouldn't match the headline.

## Consequence

Because the measure is money-weighted, a large mid-period deposit nudges the line down slightly (the capital-at-work denominator grows while gains haven't caught up). This is honest behavior, not a loss, and is the deliberate trade-off against TWR.
