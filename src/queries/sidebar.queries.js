import { useQuery } from "@tanstack/react-query";
import { fetchSidebar, getSidebarStats } from "../api/sidebar.api";
import { useSelector } from "react-redux";
import { useCandidateProfile } from "./candidate.queries";

export function useSidebarLayout() {
    const email = useSelector(state => state.user.user?.email)?.trim() || "";
    const { data: candidate } = useCandidateProfile();
    return useQuery({
        queryKey: ["sidebar", "layout", email],
        queryFn: () => fetchSidebar(email),
        enabled: Boolean(email && candidate?.id),
        staleTime: 5 * 60 * 1000,
    });
}

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
