import { useState, useRef, useCallback } from 'react';

interface ImportResult {
    success: number;
    failed: number;
    errors: string[];
}

interface ImportCSVModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetName: string;
    ownerName?: string;
    onImport: (snapshots: { date: string; value: number; investmentChange: number; notes: string }[]) => Promise<ImportResult>;
}

export default function ImportCSVModal({ isOpen, onClose, assetName, ownerName, onImport }: ImportCSVModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
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
        if (!file.name.endsWith('.csv')) {
            setResult({ success: 0, failed: 1, errors: ['File must be a CSV file'] });
            return;
        }

        setIsProcessing(true);
        try {
            const text = await file.text();
            const snapshots = parseCSV(text);

            if (snapshots.length === 0) {
                setResult({ success: 0, failed: 0, errors: ['No valid entries found in the file'] });
                return;
            }

            const importResult = await onImport(snapshots);
            setResult(importResult);
        } catch {
            setResult({ success: 0, failed: 1, errors: ['Failed to process file'] });
        } finally {
            setIsProcessing(false);
        }
    }, [onImport]);

    /* Logic moved outside component */

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

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
                    <h2 className="modal-title">Import Snapshots</h2>
                    <button className="modal-close" onClick={handleClose}>×</button>
                </div>

                <div className="modal-body">
                    <p className="import-asset-name">
                        Importing to: <strong>{assetName}</strong>
                        {ownerName && <span className="import-owner-badge"> ({ownerName})</span>}
                    </p>

                    {!result ? (
                        <>
                            <div className="import-instructions">
                                <h4>CSV File Format</h4>
                                <p>Your CSV file should have the following columns:</p>
                                <div className="csv-example">
                                    <code>Date,Value,Invested,Notes</code>
                                    <code>2024-01-15,10000,5000,"Initial deposit"</code>
                                    <code>15/02/2024,10500,0,"Monthly update"</code>
                                    <code>2024-03-15,11000,1000,"Added funds"</code>
                                </div>
                                <ul className="import-tips">
                                    <li><strong>Date:</strong> YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY</li>
                                    <li><strong>Value:</strong> Current value at snapshot date (required)</li>
                                    <li><strong>Invested:</strong> Positive = added, Negative = withdrawn</li>
                                    <li><strong>Notes:</strong> Optional description</li>
                                </ul>
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
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="drop-icon">📄</span>
                                        <span>Drag & drop CSV file here</span>
                                        <span className="drop-or">or</span>
                                        <span className="drop-browse">Click to browse</span>
                                    </>
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </>
                    ) : (
                        <div className="import-result">
                            <div className={`result-summary ${result.success > 0 ? 'success' : 'error'}`}>
                                {result.success > 0 && (
                                    <div className="result-item success">
                                        <span className="result-icon">✓</span>
                                        <span>{result.success} snapshot{result.success !== 1 ? 's' : ''} imported successfully</span>
                                    </div>
                                )}
                                {result.failed > 0 && (
                                    <div className="result-item error">
                                        <span className="result-icon">✗</span>
                                        <span>{result.failed} snapshot{result.failed !== 1 ? 's' : ''} failed</span>
                                    </div>
                                )}
                                {result.errors.length > 0 && (
                                    <div className="result-errors">
                                        {result.errors.map((err, i) => (
                                            <p key={i}>{err}</p>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button className="btn-secondary" onClick={resetState}>
                                    Import Another
                                </button>
                                <button className="btn-primary" onClick={handleClose}>
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper functions moved outside component to avoid dependency issues

const parseDateFlexible = (dateStr: string): Date | null => {
    if (!dateStr || !dateStr.trim()) return null;

    const cleaned = dateStr.trim();

    // Try ISO format first (YYYY-MM-DD)
    let date = new Date(cleaned);
    if (!isNaN(date.getTime())) return date;

    // Try DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyyMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        if (!isNaN(date.getTime())) return date;
    }

    // Try MM/DD/YYYY (US format)
    const mmddyyyyMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (mmddyyyyMatch) {
        const [, month, day, year] = mmddyyyyMatch;
        date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        if (!isNaN(date.getTime())) return date;
    }

    return null;
};

const parseCSV = (text: string): { date: string; value: number; investmentChange: number; notes: string }[] => {
    const lines = text.split('\n');
    const hasHeader = lines[0]?.toLowerCase().includes('date');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines
        .filter(line => {
            const trimmed = line.trim();
            // Filter out empty lines or lines with only commas
            return trimmed && trimmed.replace(/,/g, '').length > 0;
        })
        .map(line => {
            // Handle quoted fields properly
            const parts: string[] = [];
            let current = '';
            let inQuotes = false;

            for (const char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    parts.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            parts.push(current.trim());

            const [dateStr, valueStr, investmentChangeStr, ...notesParts] = parts;
            const notes = notesParts.join(',').replace(/^"|"$/g, '').replace(/""/g, '"');

            const parsedDate = parseDateFlexible(dateStr);

            return {
                date: parsedDate ? parsedDate.toISOString() : '',
                value: parseFloat(valueStr) || 0,
                investmentChange: parseFloat(investmentChangeStr) || 0,
                notes: notes || '',
                _rawDate: dateStr // Keep for error reporting
            };
        })
        .filter(s => {
            // Filter out entries with invalid dates or no value
            return s.date && !isNaN(new Date(s.date).getTime()) && s.value > 0;
        })
        .map(({ _rawDate, ...rest }) => rest); // Remove temporary field
};
