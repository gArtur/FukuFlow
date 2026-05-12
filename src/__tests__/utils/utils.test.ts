import { describe, it, expect } from 'vitest';
import {
    parseValue,
    formatCurrency,
    formatPercent,
    hashCode,
    handleNumberInput,
} from '../../utils/index';

// ─── parseValue ──────────────────────────────────────────────────────────────

describe('parseValue', () => {
    it('parses standard decimal (dot separator)', () => {
        expect(parseValue('1234.56')).toBe(1234.56);
    });

    it('parses European decimal (comma separator)', () => {
        expect(parseValue('1234,56')).toBe(1234.56);
    });

    it('ignores spaces (e.g. "1 234,56")', () => {
        expect(parseValue('1 234,56')).toBe(1234.56);
    });

    it('returns 0 for empty string', () => {
        expect(parseValue('')).toBe(0);
    });

    it('returns 0 for non-numeric string', () => {
        expect(parseValue('abc')).toBe(0);
    });

    it('parses integer strings', () => {
        expect(parseValue('500')).toBe(500);
    });

    it('parses zero', () => {
        expect(parseValue('0')).toBe(0);
    });
});

// ─── handleNumberInput ───────────────────────────────────────────────────────

describe('handleNumberInput', () => {
    it('calls setter for valid positive number', () => {
        const setter = vi.fn();
        handleNumberInput('123.45', setter);
        expect(setter).toHaveBeenCalledWith('123.45');
    });

    it('calls setter for valid comma decimal', () => {
        const setter = vi.fn();
        handleNumberInput('123,45', setter);
        expect(setter).toHaveBeenCalledWith('123,45');
    });

    it('calls setter for empty string', () => {
        const setter = vi.fn();
        handleNumberInput('', setter);
        expect(setter).toHaveBeenCalledWith('');
    });

    it('does not call setter for non-numeric input', () => {
        const setter = vi.fn();
        handleNumberInput('abc', setter);
        expect(setter).not.toHaveBeenCalled();
    });

    it('blocks negative input when allowNegative=false (default)', () => {
        const setter = vi.fn();
        handleNumberInput('-100', setter);
        expect(setter).not.toHaveBeenCalled();
    });

    it('allows negative input when allowNegative=true', () => {
        const setter = vi.fn();
        handleNumberInput('-100', setter, true);
        expect(setter).toHaveBeenCalledWith('-100');
    });

    it('allows a lone minus sign when allowNegative=true', () => {
        const setter = vi.fn();
        handleNumberInput('-', setter, true);
        expect(setter).toHaveBeenCalledWith('-');
    });
});

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
    it('formats USD by default with no decimals', () => {
        const result = formatCurrency(1234);
        expect(result).toContain('1,234');
        expect(result).toContain('$');
    });

    it('formats USD 0', () => {
        const result = formatCurrency(0, 'USD');
        expect(result).toContain('0');
    });

    it('formats EUR', () => {
        const result = formatCurrency(1000, 'EUR');
        expect(result).toContain('1');
        expect(result).toContain('€');
    });

    it('formats PLN', () => {
        const result = formatCurrency(500, 'PLN');
        expect(result).toContain('zł');
    });

    it('formats JPY without decimals', () => {
        const result = formatCurrency(10000, 'JPY');
        expect(result).toContain('10');
        // JPY naturally has 0 decimal digits
    });

    it('respects custom decimal count', () => {
        const result = formatCurrency(1234.567, 'USD', 2);
        expect(result).toContain('1,234.57');
    });

    it('handles negative values', () => {
        const result = formatCurrency(-500, 'USD');
        expect(result).toContain('500');
        expect(result).toMatch(/-|\(500/);
    });
});

// ─── formatPercent ───────────────────────────────────────────────────────────

describe('formatPercent', () => {
    it('prefixes positive values with +', () => {
        expect(formatPercent(5.23)).toBe('+5.23%');
    });

    it('prefixes negative values with - (no extra +)', () => {
        expect(formatPercent(-3)).toBe('-3.00%');
    });

    it('formats zero as +0.00%', () => {
        expect(formatPercent(0)).toBe('+0.00%');
    });

    it('respects custom decimal places', () => {
        expect(formatPercent(1.5, 0)).toBe('+2%');
    });

    it('respects 4 decimal places', () => {
        expect(formatPercent(1.23456, 4)).toBe('+1.2346%');
    });
});

// ─── hashCode ────────────────────────────────────────────────────────────────

describe('hashCode', () => {
    it('returns the same value for the same string', () => {
        expect(hashCode('Alice')).toBe(hashCode('Alice'));
    });

    it('returns different values for different strings', () => {
        expect(hashCode('Alice')).not.toBe(hashCode('Bob'));
    });

    it('always returns a non-negative integer', () => {
        const h = hashCode('test string');
        expect(h).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(h)).toBe(true);
    });

    it('handles empty string', () => {
        expect(hashCode('')).toBe(0);
    });
});
