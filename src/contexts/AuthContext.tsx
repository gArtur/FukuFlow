import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ApiClient } from '../lib/apiClient';

interface AuthContextType {
    isAuthenticated: boolean;
    needsSetup: boolean;
    isLoading: boolean;
    login: (password: string) => Promise<{ success: boolean; error?: string }>;
    setup: (password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    changePassword: (
        currentPassword: string,
        newPassword: string
    ) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [needsSetup, setNeedsSetup] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check auth status on mount
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        setIsLoading(true);
        try {
            // Check if we have a stored token
            const token = localStorage.getItem('auth_token');

            // Get setup status from server
            const status = await ApiClient.getAuthStatus();
            setNeedsSetup(status.needsSetup);

            // If we have a token and setup is done, verify it works
            if (token && !status.needsSetup) {
                try {
                    // Try to access a protected endpoint to verify token
                    await ApiClient.getSettings();
                    setIsAuthenticated(true);
                } catch {
                    // Token is invalid, clear it
                    localStorage.removeItem('auth_token');
                    setIsAuthenticated(false);
                }
            } else {
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Auth status check failed:', error);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await ApiClient.login(password);
            if (response.token) {
                localStorage.setItem('auth_token', response.token);
                setIsAuthenticated(true);
                return { success: true };
            }
            return { success: false, error: 'Login failed' };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed';
            return { success: false, error: message };
        }
    };

    const setup = async (password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await ApiClient.setup(password);
            if (response.token) {
                localStorage.setItem('auth_token', response.token);
                setIsAuthenticated(true);
                setNeedsSetup(false);
                return { success: true };
            }
            return { success: false, error: 'Setup failed' };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Setup failed';
            return { success: false, error: message };
        }
    };

    const logout = async (): Promise<void> => {
        try {
            await ApiClient.logout();
        } catch {
            // Ignore logout errors
        }
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
    };

    const changePassword = async (
        currentPassword: string,
        newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await ApiClient.changePassword(currentPassword, newPassword);
            if (response.token) {
                localStorage.setItem('auth_token', response.token);
                return { success: true };
            }
            return { success: false, error: 'Password change failed' };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Password change failed';
            return { success: false, error: message };
        }
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                needsSetup,
                isLoading,
                login,
                setup,
                logout,
                changePassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
