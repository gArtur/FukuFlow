import { useState, useRef, useEffect } from 'react';

interface CustomSelectProps {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (val: string) => void;
}

/**
 * Custom Select Component matching the Settings design.
 * Provides a styled dropdown with click-outside detection.
 */
export default function CustomSelect({ label, value, options, onChange }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <div className="custom-select-container" ref={containerRef}>
            <label className="settings-label">{label}</label>
            <div
                className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedOption?.label}</span>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`select-arrow ${isOpen ? 'rotated' : ''}`}
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            {isOpen && (
                <div className="custom-select-options">
                    {options.map(opt => (
                        <div
                            key={opt.value}
                            className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            {opt.label}
                            {opt.value === value && <span className="check-icon">✓</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
