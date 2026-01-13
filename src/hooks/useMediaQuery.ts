import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive breakpoint detection
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 640px)');
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

        // Set initial value (only if different, though this shouldn't happen often)
        if (matches !== mediaQuery.matches) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMatches(mediaQuery.matches);
        }

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [query, matches]);

    return matches;
}

// Predefined breakpoint hooks for convenience
// These match the breakpoints used in index.css and settings_styles.css

/** Returns true on small phones (360px and below) */
export const useIsSmallPhone = () => useMediaQuery('(max-width: 360px)');

/** Returns true on phones (640px and below) */
export const useIsMobile = () => useMediaQuery('(max-width: 640px)');

/** Returns true on tablets (641px to 1023px) */
export const useIsTablet = () => useMediaQuery('(min-width: 641px) and (max-width: 1023px)');

/** Returns true on desktop (1024px and above) */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

/** Returns true on touch devices */
export const useIsTouchDevice = () => useMediaQuery('(hover: none) and (pointer: coarse)');
