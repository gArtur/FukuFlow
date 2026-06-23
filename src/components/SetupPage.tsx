import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    getPasswordChecks,
    isPasswordValid,
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
} from '../utils/passwordPolicy';
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

        // Validate against the password policy (mirrors the backend rule)
        if (!isPasswordValid(password)) {
            setError(
                `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters and include an uppercase letter, a lowercase letter, and a number`
            );
            return;
        }

        setIsLoading(true);

        const result = await setup(password);

        if (!result.success) {
            setError(result.error || 'Setup failed');
        }

        setIsLoading(false);
    };

    const checks = getPasswordChecks(password);
    const passwordsMatch = password === confirmPassword;
    const isValid = isPasswordValid(password) && passwordsMatch && confirmPassword.length > 0;

    const requirements: { key: string; label: string; met: boolean }[] = [
        {
            key: 'length',
            label: `Between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
            met: checks.length,
        },
        { key: 'uppercase', label: 'One uppercase letter', met: checks.uppercase },
        { key: 'lowercase', label: 'One lowercase letter', met: checks.lowercase },
        { key: 'number', label: 'One number', met: checks.number },
        {
            key: 'match',
            label: 'Passwords match',
            met: confirmPassword.length > 0 && passwordsMatch,
        },
    ];

    return (
        <div className="auth-container">
            <div className="auth-card setup-card">
                <div className="auth-logo">
                    <img src="/logo.svg" alt="FukuFlow" />
                </div>
                <h1 className="auth-title">Welcome to FukuFlow</h1>
                <p className="auth-subtitle">Create a password to secure your data</p>

                <form onSubmit={handleSubmit} className="auth-form" data-testid="setup-form">
                    <div className="auth-input-group">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Create password"
                            className="auth-input"
                            autoFocus
                            disabled={isLoading}
                            data-testid="setup-password"
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
                            data-testid="setup-confirm-password"
                        />
                    </div>

                    <ul className="auth-requirements" aria-live="polite">
                        {requirements.map(req => (
                            <li
                                key={req.key}
                                className={`auth-requirement ${req.met ? 'met' : ''}`}
                            >
                                {req.label}
                            </li>
                        ))}
                    </ul>

                    {confirmPassword && !passwordsMatch && (
                        <div className="auth-hint auth-hint-error">Passwords do not match</div>
                    )}

                    {error && <div className="auth-error">{error}</div>}

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={isLoading || !isValid}
                        data-testid="setup-submit"
                    >
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
