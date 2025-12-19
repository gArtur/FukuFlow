import { useState, useCallback } from 'react';

/**
 * Generic modal state management hook.
 * Provides open/close functionality with optional data payload.
 * 
 * @template T - Type of data associated with the modal
 */
export function useModal<T = undefined>() {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<T | undefined>(undefined);

    const open = useCallback((newData?: T) => {
        setData(newData);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        // Delay clearing data to allow close animation
        setTimeout(() => setData(undefined), 200);
    }, []);

    const toggle = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    return {
        isOpen,
        data,
        open,
        close,
        toggle,
        setData
    };
}

export default useModal;
