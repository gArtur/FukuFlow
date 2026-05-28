import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useChartView } from '../../hooks/useChartView';

beforeEach(() => {
    localStorage.clear();
});

describe('useChartView', () => {
    it('defaults to the Total Worth view when nothing is saved', () => {
        const { result } = renderHook(() => useChartView());
        expect(result.current[0]).toBe('totalWorth');
    });

    it('restores a previously saved Performance view on mount', () => {
        localStorage.setItem('chartView', 'performance');
        const { result } = renderHook(() => useChartView());
        expect(result.current[0]).toBe('performance');
    });

    it('persists the view to localStorage when changed', () => {
        const { result } = renderHook(() => useChartView());
        act(() => result.current[1]('performance'));
        expect(result.current[0]).toBe('performance');
        expect(localStorage.getItem('chartView')).toBe('performance');
    });

    it('ignores an unrecognized saved value and falls back to the default', () => {
        localStorage.setItem('chartView', 'garbage');
        const { result } = renderHook(() => useChartView());
        expect(result.current[0]).toBe('totalWorth');
    });
});
