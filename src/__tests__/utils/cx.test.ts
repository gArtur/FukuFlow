import { describe, it, expect } from 'vitest';
import { cx } from '../../utils/cx';

describe('cx', () => {
    it('joins truthy class names with spaces', () => {
        expect(cx('a', 'b', 'c')).toBe('a b c');
    });

    it('drops falsy values', () => {
        expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
    });

    it('supports conditional modifiers', () => {
        const active = true;
        const disabled = false;
        expect(cx('tab', active && 'active', disabled && 'disabled')).toBe('tab active');
    });

    it('returns an empty string when nothing is truthy', () => {
        expect(cx(false, null, undefined)).toBe('');
    });
});
