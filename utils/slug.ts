export const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/&/g, '-and-')      // Replace & with 'and'
        // Remove characters that are NOT letters (Unicode), numbers, marks (modifiers), or hyphens
        .replace(/[^\p{L}\p{N}\p{M}\-]+/gu, '')
        .replace(/\-\-+/g, '-')      // Replace multiple - with single -
        .replace(/^-+/, '')          // Trim - from start of text
        .replace(/-+$/, '');         // Trim - from end of text
};

// Generates a slug that includes a truncated ID for uniqueness if desired, 
// though for this specific task we might rely on title matching first or robust ID-slug combination.
export const generateEntitySlug = (title: string, id?: string | number): string => {
    let slug = slugify(title);

    // Check for non-ASCII characters (e.g. Sinhala, Tamil) to avoid long encoded URLs
    // regex: matches characters outside standard ASCII range (0-127)
    const hasNonAscii = /[^\x00-\x7F]/.test(slug);

    // Fallback to ID if:
    // 1. Slug acts empty (extra safety)
    // 2. Slug has non-ASCII chars (to prevent %E0%... ugly URLs) AND ID is present
    if ((!slug || hasNonAscii) && id) {
        return String(id);
    }

    if (slug.length > 50) {
        slug = slug.substring(0, 50);
        // Clean up trailing hyphen if the cut ended on one
        slug = slug.replace(/-+$/, '');
    }

    return slug;
};
