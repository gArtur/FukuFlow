import type { Asset, Person } from '../types';

/**
 * Converts a string into a URL-friendly slug
 * e.g. "S&P 500" -> "s-and-p-500"
 */
export const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/[^\w-]+/g, '') // Remove all non-word chars
        .replace(/-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, ''); // Trim - from end of text
};

/**
 * Generates the readable URL for an asset
 */
export const generateAssetUrl = (ownerName: string, assetName: string): string => {
    const ownerSlug = slugify(ownerName);
    const assetSlug = slugify(assetName);
    return `/${ownerSlug}/${assetSlug}`;
};

/**
 * Finds an asset and person based on URL slugs
 */
export const resolveAssetFromSlug = (
    assets: Asset[],
    persons: Person[],
    ownerSlug: string | undefined,
    assetSlug: string | undefined
): { asset?: Asset; person?: Person } => {
    if (!ownerSlug || !assetSlug) return {};

    // 1. Find the person/owner first
    const person = persons.find(p => slugify(p.name) === ownerSlug);

    if (!person) return {};

    // 2. Find the asset that belongs to this person AND matches the asset slug
    const asset = assets.find(a => a.ownerId === person.id && slugify(a.name) === assetSlug);

    return { asset, person };
};
