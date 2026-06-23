# FukuFlow

A single-user personal wealth management dashboard. This glossary fixes the language used across the portfolio, its charts, and its time-series snapshots.

## Language

### Portfolio & value

**Total Worth**:
The current aggregate market value of the whole portfolio (sum of each asset's latest value). Also the name of the dashboard's main chart card, and the name of that chart's currency view.
_Avoid_: net worth, balance, total value.

**Invested Capital**:
The cumulative net capital deployed into the portfolio over time - the running sum of every investment change. Drawn as a line on the chart.
_Avoid_: cost basis, principal, deposits, contributions.

**Gain/Loss**:
Total Worth minus Invested Capital at a point in time. Expressed as an absolute amount or as a percentage of Invested Capital.
_Avoid_: profit, return amount, P&L.

### Chart views

**Performance** (view):
The chart view that plots **Period Return** - the return accumulated *within the selected time range*, rebased so the first point of the range is 0%. The Invested Capital line is drawn flat at 0% as that starting baseline, so the line shows how the portfolio moved during the period, independent of where it stood before.
_Avoid_: returns view, ROI chart, percentage mode.

**Period Return**:
The money-weighted (Modified-Dietz) return measured from the start of the selected time range to a given date - period gain divided by the capital at work during the period. Starts at 0% at the range start and ends at the headline percentage.
_Avoid_: ROI (which implies an all-time figure), TWR.

**Total Worth** (view):
The chart view that plots actual currency values: the Total Worth line plus the Invested Capital line, which steps upward as capital is deposited over time.
_Avoid_: value mode, absolute view, portfolio value.

**Privacy** (a.k.a. Hide):
An independent toggle that masks the actual monetary figures (header amount, axis labels, tooltips) while leaving the chart shape and the active view unchanged.
_Avoid_: blur mode, incognito.

### Asset views

**My Assets**:
The dashboard section listing every asset, shown as either the Cards View or the Table View.
_Avoid_: holdings, positions, movers.

**Cards View**:
The default My Assets layout - one card per asset showing its value, Gain/Loss and a sparkline.
_Avoid_: tiles, grid view.

**Table View**:
The alternative My Assets layout - a sortable table with one row per asset, showing the same data in orderable columns. On narrow screens only the highest-priority columns (name, value, percentage) are shown.
_Avoid_: list view, grid.

### Time series

**Snapshot**:
A recorded value of an asset on a given date, optionally carrying an investment change.
_Avoid_: entry, update, transaction, reading.

**Investment Change**:
The net cash flow into or out of an asset recorded on a snapshot (deposit positive, withdrawal negative). Summed over time it produces Invested Capital.
_Avoid_: flow, contribution, deposit (as the field name).

**Sub-period Return**:
The cash-flow-adjusted return over a single sub-period (typically one month). Computed as `change / basis × 100` where `change = endValue − (startValue + netFlow)` and `basis = startValue + netFlow`; guarded to 0% when the basis is non-positive. It is the building block that **Period Return** accumulates, and from which volatility and max-drawdown derive. Distinct from the range-cumulative `toPeriodReturnSeries`.
_Avoid_: sub-period gain, raw monthly change.


## Relationships

- An asset's derived columns are always re-derived from its **Snapshot** history, never nudged incrementally. `currentValue` holds the asset's latest **Total Worth** (the latest snapshot's value, by `date DESC, id DESC`); `purchaseAmount` holds its **Invested Capital** (`SUM(investmentChange)`). A single `reconcileAsset` operation (`server/db-helpers.js`) enforces this invariant; every snapshot add/update/delete calls it inside a transaction, and the startup `syncAssets` is just that operation looped over all assets. The column names are historical and are not renamed.
- The **Total Worth** chart card offers two **views**: **Performance** (percentage) and **Total Worth** (currency).
- **Performance** plots **Period Return**, rebased to 0% at the start of the selected time range.
- **Invested Capital** at a date = running sum of every **Investment Change** up to that date.
- **Privacy** is orthogonal to the active view - it hides figures in either view.
- The **My Assets** section offers two **views**: **Cards** (default) and **Table**. Sorting applies to the **Table View** only; **Cards View** stays ordered by name.

## Example dialogue

> **Dev:** "In the Performance view, why does the line always start at zero, even for a 1-year window?"
> **Domain expert:** "Because Performance shows **Period Return** - how the portfolio moved *during the selected range*, not since inception. The start of the range is the 0% baseline (that's the flat Invested Capital line), so you read off how much you're up or down for this period. Switch to the Total Worth view and that same baseline becomes the wavy capital-deployed line in currency."

## Flagged ambiguities

- "Total Worth" names both the chart card and its currency view. Resolved as intentional: the currency view *is* the total worth, so the toggle label and card concept coincide. The percentage view is the only one needing a distinct name - **Performance**.
- "Invested capital" vs "cost basis" - use **Invested Capital** everywhere; it is the running sum of Investment Changes, not a per-lot accounting cost basis.
- "view" labels two distinct toggles: **chart views** (Performance / Total Worth) and **asset views** (Cards / Table). They live in different sections and are unrelated.
- "list or table" - resolved to a single **Table View** (sortable rows). "List" is an avoided alias, not a separate view.
