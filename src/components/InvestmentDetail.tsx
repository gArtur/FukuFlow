import { useState, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import type { Asset, Person, ValueEntry } from '../types';
import { CATEGORY_LABELS } from '../types';
import { usePrivacy } from '../contexts/PrivacyContext';

type TimeRange = '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

interface InvestmentDetailProps {
    asset: Asset;
    persons: Person[];
    onBack: () => void;
    onAddSnapshot: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onEditSnapshot: (snapshot: ValueEntry & { id: number }) => void;
    onImportSnapshots: (snapshots: { date: string; value: number; investmentChange: number; notes: string }[]) => void;
}

export default function InvestmentDetail({
    asset,
    persons,
    onBack,
    onAddSnapshot,
    onEdit,
    onDelete,
    onEditSnapshot,
    onImportSnapshots
}: InvestmentDetailProps) {
    const { formatAmount } = usePrivacy();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const owner = persons.find(p => p.id === asset.ownerId);
    const gain = asset.currentValue - asset.purchaseAmount;
    const gainPercent = asset.purchaseAmount > 0 ? ((gain / asset.purchaseAmount) * 100) : 0;

    const history = asset.valueHistory || [];

    // Filter history based on time range
    const getFilteredHistory = () => {
        if (timeRange === 'ALL') return history;

        const now = new Date();
        let startDate = new Date('2000-01-01');

        if (timeRange === '1M') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (timeRange === '3M') {
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        } else if (timeRange === '1Y') {
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        } else if (timeRange === 'YTD') {
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        return history.filter(h => new Date(h.date) >= startDate);
    };

    const filteredHistory = getFilteredHistory();

    const chartData = {
        labels: filteredHistory.map(h => {
            const d = new Date(h.date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
        }),
        datasets: [{
            data: filteredHistory.map(h => h.value),
            borderColor: '#00D9A5',
            backgroundColor: 'rgba(0, 217, 165, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#00D9A5',
            borderWidth: 2
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 34, 0.95)',
                titleColor: '#fff',
                bodyColor: '#00D9A5',
                padding: 12,
                cornerRadius: 8,
            }
        },
        scales: {
            x: {
                display: true,
                grid: { display: false },
                ticks: { color: '#6B7280', font: { size: 10 } }
            },
            y: {
                display: true,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: {
                    color: '#6B7280',
                    font: { size: 10 },
                    callback: (value: number | string) => {
                        const num = typeof value === 'string' ? parseFloat(value) : value;
                        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                        return num;
                    }
                }
            }
        }
    };

    const handleDelete = () => {
        onDelete();
        setShowDeleteConfirm(false);
    };

    // CSV Export
    const handleExportCSV = () => {
        const headers = ['Date', 'Value', 'Investment Change', 'Notes'];
        const rows = history.map(h => [
            new Date(h.date).toISOString().split('T')[0],
            h.value.toString(),
            (h.investmentChange || 0).toString(),
            `"${(h.notes || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${asset.name.replace(/[^a-z0-9]/gi, '_')}_snapshots.csv`;
        link.click();
    };

    // CSV Import
    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').slice(1); // Skip header
            const snapshots = lines
                .filter(line => line.trim())
                .map(line => {
                    const [date, value, investmentChange, ...notesParts] = line.split(',');
                    const notes = notesParts.join(',').replace(/^"|"$/g, '').replace(/""/g, '"');
                    return {
                        date: new Date(date).toISOString(),
                        value: parseFloat(value) || 0,
                        investmentChange: parseFloat(investmentChange) || 0,
                        notes: notes || ''
                    };
                });
            onImportSnapshots(snapshots);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="investment-detail">
            <div className="detail-header">
                <button className="back-button" onClick={onBack}>
                    ← Back
                </button>
                <div className="detail-actions">
                    <button className="btn-icon" onClick={onAddSnapshot} title="Add Snapshot">
                        +
                    </button>
                    <button className="btn-icon" onClick={onEdit} title="Edit Investment">
                        ✎
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => setShowDeleteConfirm(true)} title="Delete Investment">
                        ×
                    </button>
                </div>
            </div>

            <div className="detail-info">
                <h1 className="detail-name">{asset.name}</h1>
                <div className="detail-meta">
                    <span className="detail-category">{CATEGORY_LABELS[asset.category]}</span>
                    <span className="detail-owner">{owner?.name || 'Unknown'}</span>
                </div>

                <div className="detail-stats">
                    <div className="stat-item">
                        <span className="stat-label">Current Value</span>
                        <span className="stat-value">{formatAmount(asset.currentValue)}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Total Invested</span>
                        <span className="stat-value">{formatAmount(asset.purchaseAmount)}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Gain/Loss</span>
                        <span className={`stat-value ${gain >= 0 ? 'positive' : 'negative'}`}>
                            {gain >= 0 ? '+' : ''}{formatAmount(gain)} ({gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
            </div>

            <div className="detail-chart">
                <div className="chart-header-row">
                    <h3>Performance History</h3>
                    <div className="time-range-tabs">
                        {(['1M', '3M', 'YTD', '1Y', 'ALL'] as TimeRange[]).map(range => (
                            <button
                                key={range}
                                className={`time-tab ${timeRange === range ? 'active' : ''}`}
                                onClick={() => setTimeRange(range)}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="chart-container" style={{ height: '250px' }}>
                    {filteredHistory.length > 1 ? (
                        <Line data={chartData} options={chartOptions} />
                    ) : (
                        <div className="empty-state">
                            <p>Add more snapshots to see performance chart</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="detail-history">
                <div className="history-header">
                    <h3>Snapshot History</h3>
                    <div className="history-actions">
                        <button className="btn-small" onClick={handleExportCSV}>Export CSV</button>
                        <button className="btn-small" onClick={() => fileInputRef.current?.click()}>Import CSV</button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleImportCSV}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>
                <div className="history-list">
                    {history.slice().reverse().map((entry, index) => {
                        const actualIndex = history.length - 1 - index;
                        const prevEntry = history[actualIndex - 1];
                        const valueChange = prevEntry ? entry.value - prevEntry.value : 0;
                        const changePercent = prevEntry && prevEntry.value > 0
                            ? ((valueChange / prevEntry.value) * 100)
                            : 0;

                        return (
                            <div key={index} className="history-item">
                                <div className="history-date">
                                    {new Date(entry.date).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                </div>
                                <div className="history-details">
                                    <div className="history-value">{formatAmount(entry.value)}</div>
                                    {prevEntry && (
                                        <div className={`history-change ${valueChange >= 0 ? 'positive' : 'negative'}`}>
                                            {valueChange >= 0 ? '+' : ''}{formatAmount(valueChange)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                                        </div>
                                    )}
                                    {entry.investmentChange !== undefined && entry.investmentChange !== 0 && (
                                        <div className="history-investment">
                                            {entry.investmentChange > 0 ? 'Added' : 'Withdrew'}: {formatAmount(Math.abs(entry.investmentChange))}
                                        </div>
                                    )}
                                    {entry.notes && (
                                        <div className="history-notes">{entry.notes}</div>
                                    )}
                                </div>
                                <button
                                    className="history-edit-btn"
                                    onClick={() => onEditSnapshot({ ...entry, id: (entry as any).id || actualIndex })}
                                    title="Edit Snapshot"
                                >
                                    ✎
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal modal-small" onClick={e => e.stopPropagation()}>
                        <h3>Delete Investment?</h3>
                        <p>Are you sure you want to delete "{asset.name}"? This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button className="btn-danger" onClick={handleDelete}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
