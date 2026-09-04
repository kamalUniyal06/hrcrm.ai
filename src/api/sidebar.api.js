import { http } from "../services/api";

// contact.api.js

export const getSidebarStats = async (
    { filters = {}, email, queries = [] }
) => {
    const params = email ? { email } : {}

    return http({
        method: "POST",
        params: { ...params },
        body: {
            action: "get_stats",
            queries: queries,
        },
    });
};
