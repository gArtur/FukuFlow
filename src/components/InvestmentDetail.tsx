import { useState, useMemo } from 'react';
import ConfirmationModal from './ConfirmationModal';
import type { Asset, Person, ValueEntry } from '../types';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useSettings } from '../contexts/SettingsContext';
import TotalWorthChart from './TotalWorthChart';
import { useSnapshotHistory } from '../hooks/useSnapshotHistory';
import { exportSnapshotsToCsv } from '../utils/csvExport';

interface InvestmentDetailProps {
    asset: Asset;
    persons: Person[];
    onEdit: () => void;
    onDelete: () => void;
    onEditSnapshot: (snapshot: ValueEntry & { id: number }) => void;
    onOpenImportModal: () => void;
}

export default function InvestmentDetail({
    asset,
    persons,
    onEdit,
    onDelete,
    onEditSnapshot,
    onOpenImportModal
}: InvestmentDetailProps) {
    const { formatAmount, isHidden } = usePrivacy();
    const { categories } = useSettings();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const owner = persons.find(p => p.id === asset.ownerId);
    const categoryLabel = categories.find(c => c.key === asset.category)?.label || asset.category;
    const gain = asset.currentValue - asset.purchaseAmount;
    const gainPercent = asset.purchaseAmount > 0 ? ((gain / asset.purchaseAmount) * 100) : 0;

    // Process history to add derived fields (extracted to hook)
    const enhancedHistory = useSnapshotHistory(asset.valueHistory);

    // Pagination logic
    const totalPages = Math.ceil(enhancedHistory.length / ITEMS_PER_PAGE);
    const paginatedHistory = enhancedHistory.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page when asset changes
    useMemo(() => {
        setCurrentPage(1);
    }, [asset.id]);

    const handleDelete = () => {
        onDelete();
        setShowDeleteConfirm(false);
    };

    // CSV Export (extracted to utility)
    const handleExportCSV = () => {
        exportSnapshotsToCsv(enhancedHistory, asset.name, owner?.name);
    };

    return (
        <div className="investment-detail">

            {/* Header / Hero Section */}
            <div className="detail-hero" style={{ marginBottom: '24px' }}>
                <div className="detail-title-row" style={{ alignItems: 'center', marginBottom: 0, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <h1 className="detail-title">{asset.name}</h1>
                        <span className="detail-pill">
                            {categoryLabel}
                        </span>

                        <span className="detail-owner-text" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span style={{ color: 'var(--text-primary)' }}>{owner?.name || 'Unknown'}</span>
                        </span>

                        <div className="detail-actions" style={{ marginLeft: '16px' }}>
                            <button
                                className="detail-action-btn"
                                onClick={onEdit}
                                title="Edit Investment"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                            </button>
                            <button
                                className="detail-action-btn danger"
                                onClick={() => setShowDeleteConfirm(true)}
                                title="Delete Investment"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="mb-8">
                <TotalWorthChart
                    assets={[asset]}
                    stats={{ totalGain: gain, gainPercentage: gainPercent }}
                    title="Performance History"
                />
            </div>

            {/* History List (Compact) */}
            <div className="history-card">
                <div className="history-header-row">
                    <h3 className="history-title">Snapshot History</h3>
                    <div className="history-actions-group">
                        <button
                            onClick={handleExportCSV}
                            className="btn-small-outline"
                            disabled={isHidden}
                            title={isHidden ? "Disabled in Private Mode" : "Export CSV"}
                            style={isHidden ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                            Export CSV
                        </button>
                        <button
                            onClick={onOpenImportModal}
                            className="btn-small-outline"
                            disabled={isHidden}
                            title={isHidden ? "Disabled in Private Mode" : "Import CSV"}
                            style={isHidden ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                            Import CSV
                        </button>
                    </div>
                </div>

                {/* Desktop/Tablet Table View */}
                <div className="compact-table-container desktop-only">
                    <table className="compact-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Value</th>
                                <th>Invested</th>
                                <th>Period G/L</th>
                                <th>Cum. G/L</th>
                                <th>Cum. ROI</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedHistory.map((entry, index) => (
                                <tr key={index}>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>
                                            {new Date(entry.date).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', year: 'numeric'
                                            })}
                                        </div>
                                        {entry.notes && (
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {entry.notes}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        {formatAmount(entry.value)}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span>{formatAmount(entry.cumInvested)}</span>
                                            {entry.investmentChange !== undefined && entry.investmentChange !== 0 && (
                                                <span style={{ fontSize: '11px', color: entry.investmentChange > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                                                    {entry.investmentChange > 0 ? '+' : '-'}{formatAmount(Math.abs(entry.investmentChange))}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span className={entry.periodGL >= 0 ? 'text-green' : 'text-red'}>
                                                {entry.periodGL >= 0 ? '+' : ''}{formatAmount(entry.periodGL)}
                                            </span>
                                            <span style={{ fontSize: '11px', opacity: 0.8 }} className={entry.periodGL >= 0 ? 'text-green' : 'text-red'}>
                                                {entry.periodGLPercent >= 0 ? '+' : ''}{entry.periodGLPercent.toFixed(2)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={entry.cumGL >= 0 ? 'text-green' : 'text-red'}>
                                            {entry.cumGL >= 0 ? '+' : ''}{formatAmount(entry.cumGL)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={entry.roi >= 0 ? 'text-green' : 'text-red'}>
                                            {entry.roi >= 0 ? '+' : ''}{entry.roi.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <button
                                            className="table-action-btn"
                                            onClick={() => onEditSnapshot({ ...entry, id: entry.id || entry.actualIndex })}
                                            disabled={isHidden}
                                            title={isHidden ? "Disabled in Private Mode" : "Edit"}
                                            style={isHidden ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="mobile-history-list mobile-only">
                    {paginatedHistory.map((entry, index) => (
                        <div className="mobile-history-card" key={index}>
                            <div className="mobile-history-header">
                                <span className="mobile-history-date">
                                    {new Date(entry.date).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                </span>
                                <button
                                    className="mobile-action-btn"
                                    onClick={() => onEditSnapshot({ ...entry, id: entry.id || entry.actualIndex })}
                                    disabled={isHidden}
                                    title={isHidden ? "Disabled in Private Mode" : "Edit"}
                                    style={isHidden ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                >
                                    Edit
                                </button>
                            </div>

                            <div className="mobile-history-row">
                                <span className="mobile-label">Value</span>
                                <span className="mobile-value">{formatAmount(entry.value)}</span>
                            </div>

                            <div className="mobile-history-row">
                                <span className="mobile-label">Invested</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="mobile-value">{formatAmount(entry.cumInvested)}</div>
                                    {entry.investmentChange !== undefined && entry.investmentChange !== 0 && (
                                        <div className="mobile-sub-value" style={{ color: entry.investmentChange > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                                            {entry.investmentChange > 0 ? 'Inv +' : 'Inv '}{formatAmount(entry.investmentChange)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mobile-history-row">
                                <span className="mobile-label">Period G/L</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div className={`mobile-value ${entry.periodGL >= 0 ? 'text-green' : 'text-red'}`}>
                                        {entry.periodGL >= 0 ? '+' : ''}{formatAmount(entry.periodGL)}
                                    </div>
                                    <div className={`mobile-sub-value ${entry.periodGL >= 0 ? 'text-green' : 'text-red'}`} style={{ opacity: 0.8 }}>
                                        {entry.periodGL >= 0 ? '+' : ''}{entry.periodGLPercent.toFixed(2)}%
                                    </div>
                                </div>
                            </div>

                            <div className="mobile-history-row">
                                <span className="mobile-label">Cum. G/L</span>
                                <span className={`mobile-value ${entry.cumGL >= 0 ? 'text-green' : 'text-red'}`}>
                                    {entry.cumGL >= 0 ? '+' : ''}{formatAmount(entry.cumGL)}
                                </span>
                            </div>

                            <div className="mobile-history-row">
                                <span className="mobile-label">Cum. ROI</span>
                                <span className={`mobile-value ${entry.roi >= 0 ? 'text-green' : 'text-red'}`}>
                                    {entry.roi >= 0 ? '+' : ''}{entry.roi.toFixed(2)}%
                                </span>
                            </div>

                            {entry.notes && (
                                <div className="mobile-notes">
                                    {entry.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '24px 0', borderTop: '1px solid var(--border-color)' }}>
                        <button
                            className="btn-small-outline"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'default' : 'pointer' }}
                        >
                            Previous
                        </button>
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className="btn-small-outline"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'default' : 'pointer' }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Investment?"
                message={`Are you sure you want to delete "${asset.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                isDangerous={true}
            />
        </div >
    );
}
