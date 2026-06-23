import { describe, it, expect } from 'vitest';
import {
    getPasswordChecks,
    isPasswordValid,
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
} from '../../utils/passwordPolicy';

describe('passwordPolicy', () => {
    it('reports individual checks', () => {
        expect(getPasswordChecks('')).toEqual({
            length: false,
            uppercase: false,
            lowercase: false,
            number: false,
        });
        expect(getPasswordChecks('TestPass1234')).toEqual({
            length: true,
            uppercase: true,
            lowercase: true,
            number: true,
        });
    });

    it('accepts a valid 12-char mixed password', () => {
        expect(isPasswordValid('TestPass1234')).toBe(true);
    });

    it('rejects passwords shorter than the minimum length', () => {
        expect('Test1234'.length).toBeLessThan(PASSWORD_MIN_LENGTH);
        expect(isPasswordValid('Test1234')).toBe(false);
    });

    it('rejects passwords missing a character class', () => {
        expect(isPasswordValid('alllowercase1')).toBe(false); // no uppercase
        expect(isPasswordValid('ALLUPPERCASE1')).toBe(false); // no lowercase
        expect(isPasswordValid('NoNumbersHere')).toBe(false); // no number
    });

    it('rejects passwords longer than the maximum length', () => {
        const tooLong = 'Aa1' + 'x'.repeat(PASSWORD_MAX_LENGTH);
        expect(tooLong.length).toBeGreaterThan(PASSWORD_MAX_LENGTH);
        // The length check fails (so the UI marks that requirement unmet), and
        // the overall validation rejects it.
        expect(getPasswordChecks(tooLong).length).toBe(false);
        expect(isPasswordValid(tooLong)).toBe(false);
    });
});
