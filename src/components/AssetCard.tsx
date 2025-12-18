import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler
} from 'chart.js';
import type { Asset, Person } from '../types';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useSettings } from '../contexts/SettingsContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler);

interface AssetCardProps {
    asset: Asset;
    persons: Person[];
    onCardClick: (asset: Asset) => void;
    onAddSnapshot: (asset: Asset) => void;
}

export default function AssetCard({ asset, persons, onCardClick, onAddSnapshot }: AssetCardProps) {
    const { formatAmount } = usePrivacy();
    const { categories } = useSettings();

    const gain = asset.currentValue - asset.purchaseAmount;
    const gainPercent = asset.purchaseAmount > 0
        ? ((gain / asset.purchaseAmount) * 100).toFixed(1)
        : '0';
    const isPositive = gain >= 0;

    const owner = persons.find(p => p.id === asset.ownerId);
    const ownerName = owner?.name || 'Unknown';
    const categoryLabel = categories.find(c => c.key === asset.category)?.label || asset.category;

    const sparklineData = {
        labels: (asset.valueHistory || []).map((_, i) => i.toString()),
        datasets: [{
            data: (asset.valueHistory || []).map(h => h.value),
            borderColor: isPositive ? '#00D9A5' : '#FF6B6B',
            backgroundColor: (context: any) => {
                const ctx = context.chart.ctx;
                const chartArea = context.chart.chartArea;
                if (!chartArea) return 'transparent';
                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                if (isPositive) {
                    gradient.addColorStop(0, 'rgba(0, 217, 165, 0.3)');
                    gradient.addColorStop(1, 'rgba(0, 217, 165, 0)');
                } else {
                    gradient.addColorStop(0, 'rgba(255, 107, 107, 0.3)');
                    gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
                }
                return gradient;
            },
            borderWidth: 1.5,
            tension: 0.4,
            pointRadius: 0,
            fill: true
        }]
    };

    const sparklineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
            x: { display: false },
            y: { display: false }
        },
        elements: {
            line: { borderCapStyle: 'round' as const }
        }
    };

    const handleAddSnapshot = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddSnapshot(asset);
    };

    return (
        <div className="mover-card clickable" onClick={() => onCardClick(asset)}>
            <div className="mover-header">
                <div className="mover-icon" style={{ background: isPositive ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)' }}>
                    {asset.name.charAt(0)}
                </div>
                <div className="mover-info">
                    <div className="mover-name">{asset.name}</div>
                    <div className="mover-meta">
                        <span>{categoryLabel}</span>
                        <span className="mover-owner">{ownerName}</span>
                    </div>
                </div>
                <button
                    className="snapshot-btn"
                    onClick={handleAddSnapshot}
                    title="Add Snapshot"
                >
                    +
                </button>
            </div>

            <div className="mover-body">
                <div className="mover-value-section">
                    <div className="mover-value">{formatAmount(asset.currentValue)}</div>
                    <div className={`mover-gain ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '+' : ''}{formatAmount(gain)}
                        <span className="mover-percent">{isPositive ? '+' : ''}{gainPercent}%</span>
                    </div>
                </div>
                <div className="mover-sparkline">
                    <Line data={sparklineData} options={sparklineOptions} />
                </div>
            </div>
        </div>
    );
}
