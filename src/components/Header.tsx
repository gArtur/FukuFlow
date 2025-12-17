import { usePrivacy } from '../contexts/PrivacyContext';

interface HeaderProps {
    date: string;
    onAddAsset: () => void;
    onManagePersons: () => void;
}

export default function Header({ date, onAddAsset, onManagePersons }: HeaderProps) {
    const { isHidden, togglePrivacy } = usePrivacy();

    return (
        <header className="header">
            <div className="header-content">
                <div className="header-left">
                    <div className="header-logo">
                        <div className="header-logo-icon">W</div>
                        <span className="header-title">WealthFlow</span>
                    </div>
                </div>
                <div className="header-actions">
                    <span className="header-date">{date}</span>
                    <button
                        className="icon-btn"
                        onClick={onManagePersons}
                        title="Manage persons"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </button>
                    <button
                        className={`icon-btn ${isHidden ? 'active' : ''}`}
                        onClick={togglePrivacy}
                        title={isHidden ? 'Show amounts' : 'Hide amounts'}
                    >
                        {isHidden ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                <path d="M1 1l22 22" />
                                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        )}
                    </button>
                    <button className="add-asset-btn" onClick={onAddAsset}>
                        <span>+</span>
                        <span>Add assets</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
