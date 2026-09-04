import { fetchGpc, http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";

export const getAllMovedEmails = ({
    preferences,
    page = 1,
}) => {
    return http({
        method: "POST",
        body: {
            action: "fetch",
            module: "outr_moved_email",
            page,
            ...buildTableRequestBody(
                preferences
            ),
        },
    });
}


export const getMovedEmailStats = (
    filters = {}
) =>
    http({
        method: "POST",
        body: {
            action: "outr_moved_email",
            ...filters,

            queries: [
                {
                    key: "active",
                    module:
                        "outr_offer",
                },
            ],
        },
    });

export const restoreMovedEmail = (
    item
) =>
    fetchGpc({
        params: {
            type: "restore_email",
            email: item.email,
            label_id: item.label_name,
            thread_id: item.thread_id,
            subject: item.subject,
        },
    });
