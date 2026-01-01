export const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/&/g, '-and-')      // Replace & with 'and'
        .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
        .replace(/\-\-+/g, '-')      // Replace multiple - with single -
        .replace(/^-+/, '')          // Trim - from start of text
        .replace(/-+$/, '');         // Trim - from end of text
};

// Generates a slug that includes a truncated ID for uniqueness if desired, 
// though for this specific task we might rely on title matching first or robust ID-slug combination.
// User asked for "unique first chars" if too long.
export const generateEntitySlug = (title: string, id?: string | number): string => {
    let slug = slugify(title);
    if (slug.length > 50) {
        slug = slug.substring(0, 50);
        // Clean up trailing hyphen if the cut ended on one
        slug = slug.replace(/-+$/, '');
    }
    // If ID is provided, we can append it for uniqueness, e.g. "math-class-123"
    // For now, let's keep it clean as requested, but handling collisions will require lookup logic.
    return slug;
};
