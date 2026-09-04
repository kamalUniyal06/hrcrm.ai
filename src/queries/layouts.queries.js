import { useQuery } from "@tanstack/react-query";
import { getDetailLayout, getLayout } from "../api/layouts.api";

export function useDetailLayout(entity) {
    return useQuery({
        queryKey: ["entity", entity, "detail"],
        queryFn: () => getDetailLayout(entity),
        enabled: !!entity,
    });
}
/**
 * Cache key for a live entity layout.
 *
 * Exported because the presentation writes have to re-read this exact entry:
 * a column resize saved from the table is stored on the CRM, and the table
 * only shows the stored value once this key is refetched. Keeping the key in
 * one place stops the writer and the reader drifting apart.
 */
export const entityLayoutKey = (module, view_key) => ["entity", module, view_key];

export function useLayout(module, view_key) {
    return useQuery({
        queryKey: entityLayoutKey(module, view_key),
        queryFn: () => getLayout(module, view_key),
        enabled: !!module && !!view_key,
    });
}