import { http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";

export const getAllOutboxEmails = ({
    preferences,
    page = 1,
}) =>
    http({
        method: "POST",
        body: {
            action: "fetch",
            module: "outr_outbox",

            page,

            ...buildTableRequestBody(
                preferences
            ),
        },
    });

export const deleteOutboxEmail = (
    id
) =>
    http({
        method: "POST",
        body: {
            "action": "delete",
            "module": "outr_outbox",
            id,
        },
    });
export const getOutboxStats = () =>
    http({
        method: "POST",
        body: {
            action: "get_stats",
            queries: [
                {
                    key: "all",
                    module:
                        "outr_outbox",
                },
            ],
        },
    });