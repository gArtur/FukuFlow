/**
 * Heatmap Components Module
 *
 * This module provides a modular heatmap component system.
 * Import from here for cleaner imports.
 */

// Main component - still in parent directory for backwards compatibility
// export { default as PortfolioHeatmap } from '../PortfolioHeatmap';

// Sub-components
export { default as HeatmapTooltip } from './HeatmapTooltip';
export { default as HeatmapStats } from './HeatmapStats';

// Types
export * from './types';

// Utilities
export * from './heatmapUtils';
