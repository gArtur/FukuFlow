import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/login_styles.css';

export default function SetupPage() {
    const { setup } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Validate minimum length
        if (password.length < 4) {
            setError('Password must be at least 4 characters');
            return;
        }

        setIsLoading(true);

        const result = await setup(password);

        if (!result.success) {
            setError(result.error || 'Setup failed');
        }

        setIsLoading(false);
    };

    const passwordsMatch = password === confirmPassword;
    const isValid = password.length >= 4 && passwordsMatch && confirmPassword.length > 0;

    return (
        <div className="auth-container">
            <div className="auth-card setup-card">
                <div className="auth-logo">
                    <img src="/logo.svg" alt="FukuFlow" />
                </div>
                <h1 className="auth-title">Welcome to FukuFlow</h1>
                <p className="auth-subtitle">Create a password to secure your data</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-input-group">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Create password"
                            className="auth-input"
                            autoFocus
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            className="auth-toggle-password"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            {showPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                    </div>

                    <div className="auth-input-group">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Confirm password"
                            className={`auth-input ${confirmPassword && !passwordsMatch ? 'auth-input-error' : ''}`}
                            disabled={isLoading}
                        />
                    </div>

                    {password.length > 0 && password.length < 4 && (
                        <div className="auth-hint">Password must be at least 4 characters</div>
                    )}

                    {confirmPassword && !passwordsMatch && (
                        <div className="auth-hint auth-hint-error">Passwords do not match</div>
                    )}

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="auth-button" disabled={isLoading || !isValid}>
                        {isLoading ? 'Setting up...' : 'Create Password'}
                    </button>
                </form>

                <p className="auth-note">
                    This password will be required each time you access FukuFlow. Make sure to
                    remember it!
                </p>
            </div>
        </div>
    );
}
