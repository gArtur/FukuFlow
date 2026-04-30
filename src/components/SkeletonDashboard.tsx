/**
 * SkeletonDashboard
 *
 * Renders a shimmering placeholder that mirrors the real dashboard layout,
 * giving users an instant sense of the page structure while data loads.
 * Replaces the full-screen spinner for a dramatically better perceived performance.
 */

/** A generic shimmering rectangle */
function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return <div className={`skeleton-shimmer ${className ?? ''}`} style={style} />;
}

/** Skeleton that matches the mover-card / AssetCard shape */
function SkeletonAssetCard() {
    return (
        <div className="mover-card skeleton-card" aria-hidden="true">
            {/* Header row: avatar + two lines + snapshot button */}
            <div className="mover-header">
                <Shimmer style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0 }} />
                <div
                    className="mover-info"
                    style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                    <Shimmer style={{ height: 13, width: '60%', borderRadius: 4 }} />
                    <Shimmer style={{ height: 10, width: '40%', borderRadius: 4 }} />
                </div>
                <Shimmer style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
            </div>
            {/* Body row: value + sparkline */}
            <div className="mover-body">
                <div
                    className="mover-value-section"
                    style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                    <Shimmer style={{ height: 20, width: '70%', borderRadius: 4 }} />
                    <Shimmer style={{ height: 12, width: '50%', borderRadius: 4 }} />
                </div>
                <Shimmer style={{ width: 100, height: 50, borderRadius: 6 }} />
            </div>
        </div>
    );
}

/** Skeleton for the TotalWorthChart card */
function SkeletonTotalWorthChart() {
    return (
        <div className="chart-card total-worth-card" aria-hidden="true">
            {/* Title + time tabs */}
            <div className="chart-header">
                <div
                    className="chart-header-left"
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                    <Shimmer style={{ height: 12, width: 100, borderRadius: 4 }} />
                    <Shimmer style={{ height: 32, width: 180, borderRadius: 4 }} />
                    <Shimmer style={{ height: 16, width: 120, borderRadius: 4 }} />
                </div>
                <div className="chart-header-right">
                    <Shimmer style={{ height: 30, width: 200, borderRadius: 8 }} />
                </div>
            </div>
            {/* Chart area */}
            <div className="line-chart-container" style={{ minHeight: 250 }}>
                <Shimmer style={{ width: '100%', height: '100%', borderRadius: 8 }} />
            </div>
        </div>
    );
}

/** Skeleton for the AllocationChart card */
function SkeletonAllocationChart() {
    return (
        <div className="chart-card allocation-card" aria-hidden="true">
            <div className="chart-header">
                <Shimmer style={{ height: 14, width: 100, borderRadius: 4 }} />
                <Shimmer style={{ height: 28, width: 130, borderRadius: 6 }} />
            </div>
            {/* Donut placeholder */}
            <div className="doughnut-container">
                <Shimmer
                    style={{
                        width: 180,
                        height: 180,
                        borderRadius: '50%',
                    }}
                />
            </div>
            {/* Legend rows */}
            <div className="allocation-legend" style={{ marginTop: 12 }}>
                {[70, 50, 55, 40, 45, 35].map((w, i) => (
                    <div key={i} className="allocation-legend-item">
                        <Shimmer style={{ width: 10, height: 10, borderRadius: 3 }} />
                        <Shimmer style={{ height: 12, width: `${w}%`, borderRadius: 4 }} />
                        <Shimmer style={{ height: 12, width: 36, borderRadius: 4 }} />
                        <Shimmer style={{ height: 12, width: 70, borderRadius: 4 }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

interface SkeletonDashboardProps {
    /** How many asset card placeholders to render */
    cardCount?: number;
}

export default function SkeletonDashboard({ cardCount = 8 }: SkeletonDashboardProps) {
    return (
        <main className="main-content" aria-busy="true" aria-label="Loading your wealth data…">
            {/* Family filter tab row */}
            <div className="filter-tabs" style={{ paddingBottom: 'var(--space-md)' }}>
                {['All', '', '', ''].map((_, i) => (
                    <Shimmer
                        key={i}
                        style={{ height: 34, width: i === 0 ? 52 : 72, borderRadius: 20 }}
                    />
                ))}
            </div>

            {/* Charts row */}
            <div className="charts-row">
                <SkeletonTotalWorthChart />
                <SkeletonAllocationChart />
            </div>

            {/* Assets section header */}
            <section className="movers-section">
                <div className="movers-header">
                    <div className="movers-header-left">
                        <Shimmer style={{ height: 20, width: 80, borderRadius: 4 }} />
                        <Shimmer style={{ height: 14, width: 60, borderRadius: 4 }} />
                    </div>
                    <Shimmer style={{ height: 36, width: 120, borderRadius: 8 }} />
                </div>
                <div className="movers-grid">
                    {Array.from({ length: cardCount }).map((_, i) => (
                        <SkeletonAssetCard key={i} />
                    ))}
                </div>
            </section>
        </main>
    );
}
