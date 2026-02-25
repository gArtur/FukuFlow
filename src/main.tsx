import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Simple telemetry to catch errors early
const sendLog = (level: string, message: string, details?: any) => {
    try {
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        fetch(`${apiUrl}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level,
                message,
                details: details ? details.toString() : null,
                url: window.location.href,
                userAgent: navigator.userAgent
            })
        }).catch(() => { }); // ignore fetch errors
    } catch (e) { }
};

window.addEventListener('error', (event) => {
    sendLog('fatal', event.message, event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
    sendLog('fatal', 'Unhandled Promise Rejection', event.reason);
});

console.log('[App] Starting initialization...');

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
