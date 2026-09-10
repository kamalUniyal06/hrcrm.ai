import { apiRequest, http } from "../services/api";
import { FETCH_GPC_X_API_KEY } from "../store/constants";

export async function fetchSidebar(email) {
    const loginEmail = email?.trim();
    if (!loginEmail) throw new Error("Your login email is required to load the sidebar.");
    const response = await apiRequest({
        endpoint: "https://flight.hrcrm.ai/index.php",
        params: { entryPoint: "sidebar", email: loginEmail },
        headers: { "X-Api-Key": FETCH_GPC_X_API_KEY },
    });
    if (response?.success === false) throw new Error(response.message || "Could not load the sidebar.");
    const groups = Array.isArray(response) ? response : response?.data;
    if (!Array.isArray(groups)) throw new Error("The sidebar returned an unexpected response.");
    return groups;
}

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
