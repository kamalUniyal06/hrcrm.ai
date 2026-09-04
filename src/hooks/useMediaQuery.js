import { useEffect, useState } from "react";

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 *
 * @param {string} query - A media query string, e.g. "(min-width: 1024px)".
 * @returns {boolean} true while the query matches.
 */
export function useMediaQuery(query) {
    const getMatch = () =>
        typeof window !== "undefined" && typeof window.matchMedia === "function"
            ? window.matchMedia(query).matches
            : false;

    const [matches, setMatches] = useState(getMatch);

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return;
        }

        const mql = window.matchMedia(query);
        const onChange = (event) => setMatches(event.matches);

        // Sync in case the query changed between render and effect.
        setMatches(mql.matches);

        if (typeof mql.addEventListener === "function") {
            mql.addEventListener("change", onChange);
            return () => mql.removeEventListener("change", onChange);
        }

        // Safari < 14 fallback
        mql.addListener(onChange);
        return () => mql.removeListener(onChange);
    }, [query]);

    return matches;
}

/**
 * Tailwind's `lg` breakpoint (1024px) — the point where the sidebar stops
 * being an off-canvas drawer and becomes a permanent in-flow column.
 */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/** true on `lg` screens and up. */
export function useIsDesktop() {
    return useMediaQuery(DESKTOP_QUERY);
}

export default useMediaQuery;
