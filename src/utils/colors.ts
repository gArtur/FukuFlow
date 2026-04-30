/**
 * Utility to generate a consistent hue for a given person's name.
 * Used to assign distinct colors to different owners (Alice, Bob, etc.)
 */

// A curated list of highly distinct, aesthetically pleasing hues
// to ensure no two randomly assigned people look identical.
const DISTINCT_HUES = [
    220, // Blue
    320, // Pink
    160, // Mint/Green
    25, // Orange/Rust
    280, // Purple
    190, // Cyan
    345, // Rose
    45, // Amber
    260, // Indigo
    100, // Lime
];

export function getPersonColorHue(name: string | undefined | null): number {
    if (!name || name === 'Unknown' || name === 'Portfolio') return -1;

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % DISTINCT_HUES.length;
    return DISTINCT_HUES[index];
}
