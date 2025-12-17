import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement
} from 'chart.js';
import type { Asset } from '../types';
import { CATEGORY_LABELS } from '../types';
import { usePrivacy } from '../contexts/PrivacyContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement);

interface AssetCardProps {
    asset: Asset;
    personLabels: Record<string, string>;
    onUpdateValue: (id: string) => void;
    onEdit: (asset: Asset) => void;
    onDelete: (id: string) => void;
}

export default function AssetCard({ asset, personLabels, onUpdateValue, onEdit, onDelete }: AssetCardProps) {
    const { formatAmount } = usePrivacy();

    const gain = asset.currentValue - asset.purchaseAmount;
    const gainPercent = asset.purchaseAmount > 0
        ? ((gain / asset.purchaseAmount) * 100).toFixed(1)
        : '0';
    const isPositive = gain >= 0;

    // Mini sparkline data from value history
    const sparklineData = {
        labels: asset.valueHistory.map((_, i) => i.toString()),
        datasets: [{
            data: asset.valueHistory.map(h => h.value),
            borderColor: isPositive ? '#00D9A5' : '#FF6B6B',
            borderWidth: 1.5,
            tension: 0.4,
            pointRadius: 0,
            fill: false
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

    return (
        <div className="mover-card">
            <div className="mover-header">
                <div className="mover-icon" style={{ background: isPositive ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)' }}>
                    {asset.name.charAt(0)}
                </div>
                <div className="mover-info">
                    <div className="mover-name">{asset.name}</div>
                    <div className="mover-meta">
                        <span>{CATEGORY_LABELS[asset.category]}</span>
                        <span className="mover-owner">{personLabels[asset.owner]}</span>
                    </div>
                </div>
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

            <div className="mover-actions">
                <button className="mover-btn primary" onClick={() => onUpdateValue(asset.id)}>
                    Update
                </button>
                <button className="mover-btn" onClick={() => onEdit(asset)}>
                    Edit
                </button>
                <button className="mover-btn danger" onClick={() => onDelete(asset.id)}>
                    ×
                </button>
            </div>
        </div>
    );
}
