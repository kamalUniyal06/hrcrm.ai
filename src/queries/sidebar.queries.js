import { useQuery } from "@tanstack/react-query";
import { getSidebarStats } from "../api/sidebar.api";

/**
 * Query Keys
 */
export const sidebarKeys = {
    all: ["sidebar"],

    lists: (filters = {}) => [
        "sidebar",
        "list",
        filters,
    ],

    stats: (filters = {}, email) => [
        "sidebar",
        "stats",
        filters,
        email
    ],
};


export const useSidebarStats = ({ email, queries }) => {
    // queries && console.log("QUER", queries)
    return useQuery({
        queryKey: sidebarKeys.stats({ email, queries }),
        queryFn: () => getSidebarStats({ email, queries }),
        enabled: !!queries

    });
};
