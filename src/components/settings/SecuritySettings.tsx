import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { cx } from '../../utils';
import styles from './Settings.module.css';

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
        <section id="security" className={styles.settingsSection}>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderLeft}>
                    <h2 className={styles.sectionTitle}>Security</h2>
                </div>
            </div>
            <div className={styles.settingsGroupCard}>
                {!isChangingPassword ? (
                    <div className={styles.dataRow}>
                        <div className={styles.dataBlock}>
                            <div className={styles.dataBlockInfo}>
                                <h3>Change Password</h3>
                                <p>Update your account password</p>
                            </div>
                            <button
                                className={styles.btnDataAction}
                                onClick={() => setIsChangingPassword(true)}
                                data-testid="change-password-btn"
                            >
                                Change Password
                                <span className={styles.iconRight}>🔑</span>
                            </button>
                        </div>
                        <div className={styles.dataBlock}>
                            <div className={styles.dataBlockInfo}>
                                <h3>Sign Out</h3>
                                <p>End your current session</p>
                            </div>
                            <button
                                className={styles.btnLogout}
                                onClick={handleLogout}
                                data-testid="logout-btn"
                            >
                                Logout
                                <span className={styles.iconRight}>→</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles.passwordChangeForm}>
                        <div className={styles.passwordFormHeader}>
                            <h3>Change Password</h3>
                            <p>Enter your current password and choose a new one</p>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabelSm} htmlFor="currentPassword">
                                CURRENT PASSWORD
                            </label>
                            <input
                                type="password"
                                id="currentPassword"
                                className={styles.inputDark}
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                data-testid="current-password-input"
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabelSm} htmlFor="newPassword">
                                NEW PASSWORD
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                className={styles.inputDark}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                                minLength={4}
                                disabled={isLoading}
                                data-testid="new-password-input"
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabelSm} htmlFor="confirmPassword">
                                CONFIRM NEW PASSWORD
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                className={styles.inputDark}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                data-testid="confirm-new-password-input"
                            />
                        </div>

                        {error && <div className={styles.errorMessage}>{error}</div>}
                        {success && <div className={styles.successMessage}>{success}</div>}

                        <div className={styles.passwordFormActions}>
                            <button
                                type="button"
                                className={styles.btnCancel}
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
                                className={cx(styles.btnDataAction, styles.btnSave)}
                                disabled={
                                    isLoading ||
                                    !currentPassword ||
                                    !newPassword ||
                                    !confirmPassword
                                }
                                data-testid="save-password-btn"
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
