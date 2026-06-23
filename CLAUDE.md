# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Frontend only (port 5173)
npm run dev:server    # Backend only (port 3001)
npm run dev:all       # Both concurrently (recommended)

# Build
npm run build         # TypeScript check + Vite production build
npm run build:full    # Package as standalone .exe (Windows)

# Code quality
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier
npm run format:check  # Check formatting without writing
npm run typecheck     # TypeScript type check only

# Frontend tests (vitest + Testing Library, jsdom)
npm test              # Run frontend unit/component tests (src/**/*.{test,spec}.{ts,tsx})
npm run test:watch    # Watch mode
npm run test:ui       # Vitest UI

# Backend tests (vitest + supertest, in-memory SQLite)
npm run test:server           # Run backend tests from repo root
npm test --prefix server      # Same, run directly in server/

# End-to-end tests (Playwright)
npm run test:e2e              # Headless; also :e2e:ui, :e2e:headed, :e2e:debug

# Utilities
node scripts/generate_sample_data.cjs   # Seed sample portfolio data
node scripts/clear_sample_data.cjs      # Remove sample data
```

Full verification is `typecheck` + `lint` + `npm test`. The frontend has a vitest test suite (Testing Library + jsdom, config in `vite.config.ts`, shared setup in `src/test/setup.ts`) under `src/__tests__/`, covering utilities, hooks, and components. The backend has an integration test suite in `server/tests/` (vitest + supertest, in-memory SQLite). Playwright drives end-to-end tests (`playwright.config.ts`).

> The backend (`server/`) has its own `package.json`; run `npm install --prefix server` once before using the backend dev server or its tests.

## Architecture

**FukuFlow** is a single-user personal wealth management dashboard. It is a full-stack app packagable as a Windows `.exe` with system tray integration.

### Stack

- **Frontend**: React 19 + TypeScript + Vite, React Router, Chart.js (via react-chartjs-2)
- **Backend**: Express 5, Node.js 24+, SQLite3
- **Auth**: Single-user JWT (the auth table enforces `CHECK id=1`); tokens invalidated server-side via `tokenVersion`
- **Security**: Helmet, CORS, rate limiting (express-rate-limit)

### Frontend (`src/`)

State flows through React Contexts rather than a global store:
- `AuthContext` - JWT token management, login/logout
- `SettingsContext` - app-wide preferences (theme, currency, date format)
- `PrivacyContext` - hides monetary values while showing trends

Custom hooks own data-fetching and domain logic:
- `usePortfolio` - aggregated portfolio stats, asset list, time-range filtering
- `usePersons` - multi-person ownership
- `useSnapshotActions` - create/edit/delete value snapshots
- `useFormatting` - currency/date formatting from SettingsContext

`src/lib/apiClient.ts` is the single HTTP boundary - all API calls go through it (attaches JWT, handles 401 redirect).

`src/types/index.ts` is the canonical type source - `Asset`, `Person`, `ValueEntry`, `PortfolioStats`, `TimeRange`, etc.

### Backend (`server/`)

| File | Purpose |
|---|---|
| `server/index.js` | Entry point - DB init, system tray, starts the HTTP server |
| `server/app.js` | Express app factory `createApp(db)` - wires middleware, routes, static serving |
| `server/db.js` | SQLite init, `initSchema(db)` (used by tests too), schema migrations |
| `server/config.js` | Environment-based config (`PORT`, `JWT_SECRET`, `CORS_ORIGIN`) |
| `server/routes/` | One file per resource: auth, assets, persons, categories, snapshots, settings, backup |
| `server/middleware/auth.js` | JWT verification; reads `db` from `req.app.locals.db` |
| `server/tests/` | Integration tests (vitest + supertest, each suite uses an in-memory SQLite DB) |

### Database schema (SQLite)

```
persons        - id, name, displayOrder
assets         - id, name, category, ownerId, purchaseAmount, purchaseDate, currentValue, symbol
asset_history  - id, assetId, date, value, investmentChange, notes
categories     - id, key, label, color, isDefault
settings       - key, value
auth           - id (always 1), passwordHash, tokenVersion
```

`asset_history` is the time-series backbone - all charts and the portfolio heatmap read from it.

### Key patterns

- **Snapshots**: A "snapshot" records the current value of an asset on a given date. The heatmap visualizes monthly returns from snapshot history.
- **CSV import**: Bulk-load historical snapshots via a CSV upload (parsed client-side, posted to `/api/snapshots/bulk`).
- **Backup/restore**: Full SQLite dump downloadable via `/api/backup`; restore replaces the database file.
- **Versioning**: `vite.config.ts` injects the git commit hash as `VITE_GIT_COMMIT` at build time.

## Code style

Prettier config (`.prettierrc`): 4-space indent, 100-char line width, single quotes, trailing commas.

ESLint warns on `any` usage (`@typescript-eslint/no-explicit-any: warn`). React hooks exhaustive-deps is enforced as a warning.
