# Release Notes - v0.80

We are excited to announce version 0.80 of WealthFlow. This release focuses on visual polish, improved ownership clarity, and infrastructure stability.

## Key Features

### 🎨 Unified Ownership System (Person Badges)
- **Distinct Visuals**: Replaced plain text owner labels with a color-coded `PersonBadge` system.
- **Deterministic Coloring**: Each person is assigned a distinct, high-contrast hue from a curated palette, ensuring "Bob" and "Charlie" are always visually distinguishable.
- **Global Integration**: Badges are now consistently displayed in the Dashboard, Asset List, Heatmaps, and Modals.
- **Theme Support**: Badges automatically adapt their colors and contrast for Light, Dark, and High-Contrast modes.

### 📊 Enhanced Heatmap & Mobile UX
- **Mobile-First Design**: Completely refactored the heatmap components for a smoother touch experience and better responsive layouts.
- **Detailed Insights**: Added asset-specific heatmap views and the ability to delete snapshots directly from the history.
- **Stretching Fix**: Resolved layout issues where badges would stretch inconsistently in flex containers.

### ⚡ Performance & Loading
- **Skeleton Dashboard**: Added a modern skeleton loading state to provide instant visual feedback while data is being fetched.
- **Optimized Rendering**: Implemented memoization and performance utilities to ensure the UI remains responsive even with large datasets.

## UI/UX Refinements
- **Toasts & Feedback**: Integrated `react-hot-toast` for beautiful, non-intrusive notifications.
- **Smart Formatting**: Improved currency localization (e.g., proper spacing for PLN) and added "Invested Amount" to detail pop-ups.
- **Better Data Entry**: Number inputs now automatically trim spaces, and we've added convenient "Copy" features for asset details.
- **Compact Selectors**: Redesigned the "Select Asset" dropdown in the Add Snapshot modal to be more compact and readable.

## Infrastructure & Versioning
- **Automated Versioning**: The application now displays its version based on Git tags/commits.
- **Docker Improvements**: Short commit SHAs are now injected during Docker builds for better traceability.
- **CI/CD**: Refined GitHub Actions pipelines and updated security headers (Helmet) to support flexible deployment environments.
- **Dev Tools**: Added `npm run dev:all` for easier local development of both frontend and backend.

## Bug Fixes
- Fixed "sticky" asset selection in the Add Snapshot modal when opened from the header.
- Corrected vertical alignment of badges relative to adjacent text.
- Standardized backup filename conventions.
