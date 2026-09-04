import { http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";


export const getForwardStats = async (
    filters = {}, userId
) => {
    return http({
        method: "POST",
        body: {
            action: "get_stats",
            ...buildTableRequestBody(filters),
            queries: [
                {
                    "key": "forwarded",
                    "module": "Contacts",
                    "filters": {
                        "gpc_assigned_to": userId,
                        "direction": "inbound"
                    }
                },

            ]
        },
    });
}