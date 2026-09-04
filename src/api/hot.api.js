import { http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";

export const getAllHotEvents = ({
    preferences,
    page = 1,
}) =>
    http({
        method: "POST",
        body: {
            action: "fetch",
            module: "outr_alerts",

            page,

            ...buildTableRequestBody(
                preferences
            ),
        },
    });

