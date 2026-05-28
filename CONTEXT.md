# FukuFlow

A single-user personal wealth management dashboard. This glossary fixes the language used across the portfolio, its charts, and its time-series snapshots.

## Language

### Portfolio & value

**Total Worth**:
The current aggregate market value of the whole portfolio (sum of each asset's latest value). Also the name of the dashboard's main chart card, and the name of that chart's currency view.
_Avoid_: net worth, balance, total value.

**Invested Capital**:
The cumulative net capital deployed into the portfolio over time — the running sum of every investment change. Drawn as a line on the chart.
_Avoid_: cost basis, principal, deposits, contributions.

**Gain/Loss**:
Total Worth minus Invested Capital at a point in time. Expressed as an absolute amount or as a percentage of Invested Capital.
_Avoid_: profit, return amount, P&L.

### Chart views

**Performance** (view):
The chart view that plots Gain/Loss as a percentage of Invested Capital at each date — `(value − invested) / invested × 100`. The Invested Capital line is drawn flat at 0%, so the gap between it and the value line is the return %.
_Avoid_: returns view, ROI chart, percentage mode.

**Total Worth** (view):
The chart view that plots actual currency values: the Total Worth line plus the Invested Capital line, which steps upward as capital is deposited over time.
_Avoid_: value mode, absolute view, portfolio value.

**Privacy** (a.k.a. Hide):
An independent toggle that masks the actual monetary figures (header amount, axis labels, tooltips) while leaving the chart shape and the active view unchanged.
_Avoid_: blur mode, incognito.

### Time series

**Snapshot**:
A recorded value of an asset on a given date, optionally carrying an investment change.
_Avoid_: entry, update, transaction, reading.

**Investment Change**:
The net cash flow into or out of an asset recorded on a snapshot (deposit positive, withdrawal negative). Summed over time it produces Invested Capital.
_Avoid_: flow, contribution, deposit (as the field name).

## Relationships

- The **Total Worth** chart card offers two **views**: **Performance** (percentage) and **Total Worth** (currency).
- **Performance** % at a date = (Total Worth − Invested Capital) / Invested Capital × 100.
- **Invested Capital** at a date = running sum of every **Investment Change** up to that date.
- **Privacy** is orthogonal to the active view — it hides figures in either view.

## Example dialogue

> **Dev:** "In the Performance view, why does the invested line sit flat at zero?"
> **Domain expert:** "Because Performance shows return *relative to* Invested Capital — the invested line is the baseline you're measuring against, so it's 0% by definition. In the Total Worth view that same line becomes wavy, since there it's the actual capital deployed in currency."

## Flagged ambiguities

- "Total Worth" names both the chart card and its currency view. Resolved as intentional: the currency view *is* the total worth, so the toggle label and card concept coincide. The percentage view is the only one needing a distinct name — **Performance**.
- "Invested capital" vs "cost basis" — use **Invested Capital** everywhere; it is the running sum of Investment Changes, not a per-lot accounting cost basis.
