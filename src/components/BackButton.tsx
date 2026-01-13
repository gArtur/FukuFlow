import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
    label?: string;
}

export default function BackButton({ label = 'Back to Dashboard' }: BackButtonProps) {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate('/')}
            className="detail-action-btn"
            style={{
                marginRight: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                height: '40px',
                width: '40px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
            title={label}
            aria-label={label}
        >
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
        </button>
    );
}
