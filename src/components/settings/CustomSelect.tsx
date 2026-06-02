import { useState, useRef, useEffect } from 'react';
import { cx } from '../../utils';
import styles from './Settings.module.css';

interface CustomSelectProps {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (val: string) => void;
    /** Stable hook for e2e: applied to the trigger; options get `${testId}-option`. */
    testId?: string;
}

/**
 * Custom Select Component matching the Settings design.
 * Provides a styled dropdown with click-outside detection.
 */
export default function CustomSelect({
    label,
    value,
    options,
    onChange,
    testId,
}: CustomSelectProps) {
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
        <div className={styles.customSelectContainer} ref={containerRef}>
            <label className={styles.settingsLabel}>{label}</label>
            <div
                className={cx(styles.customSelectTrigger, isOpen && styles.open)}
                onClick={() => setIsOpen(!isOpen)}
                data-testid={testId}
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
                    className={cx(styles.selectArrow, isOpen && styles.rotated)}
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            {isOpen && (
                <div className={styles.customSelectOptions}>
                    {options.map(opt => (
                        <div
                            key={opt.value}
                            className={cx(
                                styles.customSelectOption,
                                opt.value === value && styles.selected
                            )}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            data-testid={testId ? `${testId}-option` : undefined}
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
