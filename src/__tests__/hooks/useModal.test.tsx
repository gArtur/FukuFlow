import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModal } from '../../hooks/useModal';

describe('useModal', () => {
    it('starts closed with no data', () => {
        const { result } = renderHook(() => useModal<string>());
        expect(result.current.isOpen).toBe(false);
        expect(result.current.data).toBeUndefined();
    });

    // ─── open ────────────────────────────────────────────────────────────────

    it('open() sets isOpen to true', () => {
        const { result } = renderHook(() => useModal<string>());
        act(() => result.current.open());
        expect(result.current.isOpen).toBe(true);
    });

    it('open(data) stores the data payload', () => {
        const { result } = renderHook(() => useModal<string>());
        act(() => result.current.open('hello'));
        expect(result.current.data).toBe('hello');
    });

    it('open() with object payload stores the object', () => {
        const { result } = renderHook(() => useModal<{ id: number }>());
        act(() => result.current.open({ id: 42 }));
        expect(result.current.data).toEqual({ id: 42 });
    });

    // ─── close ───────────────────────────────────────────────────────────────

    it('close() sets isOpen to false immediately', () => {
        const { result } = renderHook(() => useModal<string>());
        act(() => result.current.open('test'));
        act(() => result.current.close());
        expect(result.current.isOpen).toBe(false);
    });

    it('close() clears data after 200 ms delay', async () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useModal<string>());

        act(() => result.current.open('some data'));
        act(() => result.current.close());

        // Data should still be present immediately after close (for animation)
        expect(result.current.data).toBe('some data');

        // Advance past the 200 ms timeout
        await act(async () => {
            vi.advanceTimersByTime(200);
        });

        expect(result.current.data).toBeUndefined();
        vi.useRealTimers();
    });

    // ─── toggle ───────────────────────────────────────────────────────────────

    it('toggle() opens a closed modal', () => {
        const { result } = renderHook(() => useModal());
        act(() => result.current.toggle());
        expect(result.current.isOpen).toBe(true);
    });

    it('toggle() closes an open modal', () => {
        const { result } = renderHook(() => useModal());
        act(() => result.current.open());
        act(() => result.current.toggle());
        expect(result.current.isOpen).toBe(false);
    });

    // ─── setData ─────────────────────────────────────────────────────────────

    it('setData() updates the payload without changing isOpen', () => {
        const { result } = renderHook(() => useModal<string>());
        act(() => result.current.open('initial'));

        act(() => result.current.setData('updated'));

        expect(result.current.data).toBe('updated');
        expect(result.current.isOpen).toBe(true);
    });

    it('setData() works on a closed modal without opening it', () => {
        const { result } = renderHook(() => useModal<string>());
        act(() => result.current.setData('background'));
        expect(result.current.data).toBe('background');
        expect(result.current.isOpen).toBe(false);
    });
});
