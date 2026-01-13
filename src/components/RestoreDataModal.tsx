import { useState, useRef, useCallback } from 'react';
import { ApiClient } from '../lib/apiClient';

interface RestoreResult {
    success: boolean;
    error?: string;
}

interface RestoreDataModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RestoreDataModal({ isOpen, onClose }: RestoreDataModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<RestoreResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setResult(null);
        setIsProcessing(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const processFile = useCallback(async (file: File) => {
        if (!file.name.endsWith('.json')) {
            setResult({ success: false, error: 'File must be a JSON file' });
            return;
        }

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async event => {
            try {
                const json = JSON.parse(event.target?.result as string);
                await ApiClient.restoreBackup(json);
                setResult({ success: true });
                // Reload after a short delay to let the user see the success message
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                console.error('Restore failed:', error);
                setResult({ success: false, error: error.message || 'Failed to restore backup' });
            } finally {
                setIsProcessing(false);
            }
        };
        reader.onerror = () => {
            setResult({ success: false, error: 'Failed to read file' });
            setIsProcessing(false);
        };
        reader.readAsText(file);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);

            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        },
        [processFile]
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        e.target.value = '';
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal import-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Restore Data</h2>
                    <button className="modal-close" onClick={handleClose}>
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    {!result ? (
                        <>
                            <div
                                className="import-instructions"
                                style={{ borderLeft: '4px solid var(--accent-red)' }}
                            >
                                <h4 style={{ color: 'var(--accent-red)' }}>
                                    ⚠️ WARNING: DATA OVERWRITE
                                </h4>
                                <p>
                                    Restoring a backup will{' '}
                                    <strong>PERMANENTLY REPLACE ALL CURRENT DATA</strong>.
                                </p>
                                <p>
                                    This action cannot be undone. Please ensure you have a backup of
                                    your current data if you wish to keep it.
                                </p>
                            </div>

                            <div
                                className={`drop-zone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => !isProcessing && fileInputRef.current?.click()}
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="spinner small"></div>
                                        <span>Restoring data...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="drop-icon">📂</span>
                                        <span>Drag & drop backup JSON file here</span>
                                        <span className="drop-or">or</span>
                                        <span className="drop-browse">Click to browse</span>
                                    </>
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </>
                    ) : (
                        <div className="import-result">
                            <div
                                className={`result-summary ${result.success ? 'success' : 'error'}`}
                            >
                                {result.success ? (
                                    <div className="result-item success">
                                        <span className="result-icon">✓</span>
                                        <span>Restore successful! Reloading...</span>
                                    </div>
                                ) : (
                                    <div className="result-item error">
                                        <span className="result-icon">✗</span>
                                        <span>Restore failed: {result.error}</span>
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions">
                                {!result.success && (
                                    <button className="btn-secondary" onClick={resetState}>
                                        Try Again
                                    </button>
                                )}
                                <button className="btn-primary" onClick={handleClose}>
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
