/**
 * Matches a URL path against a pattern.
 * Patterns can include named parameters prefixed with ':' (e.g., '/teacher/:id').
 * Returns a map of parameter names to values if matched, or null if not matched.
 */
export const matchPath = (path: string, pattern: string): Record<string, string> | null => {
    const pathSegments = path.split('/').filter(Boolean);
    const patternSegments = pattern.split('/').filter(Boolean);

    if (pathSegments.length !== patternSegments.length) {
        return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternSegments.length; i++) {
        const patternSegment = patternSegments[i];
        const pathSegment = pathSegments[i];

        if (patternSegment.startsWith(':')) {
            const paramName = patternSegment.slice(1);
            params[paramName] = decodeURIComponent(pathSegment);
        } else if (patternSegment !== pathSegment) {
            return null;
        }
    }

    return params;
};
