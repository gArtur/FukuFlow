interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function PaginationControls({ currentPage, totalPages, onPageChange }: PaginationControlsProps) {
    if (totalPages <= 1) return null;

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '24px 0', borderTop: '1px solid var(--border-color)' }}>
            <button
                className="btn-small-outline"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'default' : 'pointer' }}
            >
                Next
            </button>
        </div>
    );
}
