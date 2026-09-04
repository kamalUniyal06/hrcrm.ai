import { fetchGpc, http } from "../services/api";

/**
 * Get Websites
 */
export const getWebsites = () => fetchGpc({ params: { type: "get_websites" } })

/**
 * Create Website
 */
export const createWebsite = (
    data
) =>
    http({
        method: "POST",
        body: {
            action: "create",
            module: "website",
            ...data,
        },
    });

/**
 * Update Website
 */
export const updateWebsite = (
    data
) =>
    http({
        method: "POST",
        body: {
            action: "update",
            module: "website",
            ...data,
        },
    });

/**
 * Delete Website
 */
export const deleteWebsite = (
    id
) =>
    http({
        method: "POST",
        body: {
            action: "delete",
            module: "website",
            id,
        },
    });

/**
 * Get Website By Id
 */
export const getWebsiteById = (
    id
) =>
    http({
        method: "POST",
        body: {
            action: "get",
            module: "website",
            id,
        },
    });