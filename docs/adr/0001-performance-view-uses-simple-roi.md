# Performance view uses simple ROI, not time-weighted return

The Total Worth chart's **Performance** view plots cumulative gain as a percentage of Invested Capital at each date — `(value − invested) / invested × 100` — with the Invested Capital line drawn flat at 0%. We deliberately chose this over a time-weighted return (TWR) wealth index.

## Why

- It matches the headline figure the app already shows (`gainPercent`), so the chart's endpoint and the big number agree.
- It reuses the `value`/`invested` timeline `calculatePerformance` already produces — no new return engine.
- The flat baseline reads intuitively as "your invested capital" and the gap above/below it as profit/loss %.

## Consequence

A deposit transiently dents the line, because the denominator (Invested Capital) jumps while gains haven't caught up yet. This is **not** a loss — it's the known artifact of simple ROI. TWR would neutralize deposits and be the "truer" measure of investment skill, but its endpoint wouldn't equal the headline % and it adds complexity. If we ever need deposit-neutralized performance, the heatmap's cash-flow-adjusted period returns (`monthlyMarketReturns` in `performance.ts`) are the building block to revisit this.
