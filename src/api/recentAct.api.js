import { http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";

export const getAllRecentEvents = ({
    preferences,
    page = 1,
}) =>
    http({
        method: "POST",
        body: {
            action: "fetch",
            module: "outr_recent_activity",
            page,
            ...buildTableRequestBody(
                preferences
            ),
        },
    });

