import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function SecuritySettings() {
    const { changePassword, logout } = useAuth();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (newPassword.length < 4) {
            setError('New password must be at least 4 characters');
            return;
        }

        setIsLoading(true);
        const result = await changePassword(currentPassword, newPassword);
        setIsLoading(false);

        if (result.success) {
            setSuccess('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsChangingPassword(false);
        } else {
            setError(result.error || 'Failed to change password');
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <section id="security" className="settings-section">
            <div className="movers-header">
                <div className="movers-header-left">
                    <h2 className="movers-title">Security</h2>
                </div>
            </div>
            <div className="settings-group-card">
                {!isChangingPassword ? (
                    <div className="data-row">
                        <div className="data-block">
                            <div className="data-block-info">
                                <h3>Change Password</h3>
                                <p>Update your account password</p>
                            </div>
                            <button
                                className="btn-data-action"
                                onClick={() => setIsChangingPassword(true)}
                            >
                                Change Password
                                <span className="icon-right">🔑</span>
                            </button>
                        </div>
                        <div className="data-block">
                            <div className="data-block-info">
                                <h3>Sign Out</h3>
                                <p>End your current session</p>
                            </div>
                            <button
                                className="btn-logout"
                                onClick={handleLogout}
                            >
                                Logout
                                <span className="icon-right">→</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="password-change-form">
                        <div className="password-form-header">
                            <h3>Change Password</h3>
                            <p>Enter your current password and choose a new one</p>
                        </div>

                        <div className="input-group">
                            <label className="input-label-sm" htmlFor="currentPassword">CURRENT PASSWORD</label>
                            <input
                                type="password"
                                id="currentPassword"
                                className="input-dark"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label-sm" htmlFor="newPassword">NEW PASSWORD</label>
                            <input
                                type="password"
                                id="newPassword"
                                className="input-dark"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={4}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label-sm" htmlFor="confirmPassword">CONFIRM NEW PASSWORD</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                className="input-dark"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}

                        <div className="password-form-actions">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => {
                                    setIsChangingPassword(false);
                                    setError(null);
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-data-action btn-save"
                                disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                            >
                                {isLoading ? 'Saving...' : 'Save Password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
}
