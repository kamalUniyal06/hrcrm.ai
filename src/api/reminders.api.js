import { fetchGpc, http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";

export const getAllReminders = ({
    preferences,
    page = 1,
    email
}) => {
    const params = email ? { email } : {}
    return http({
        method: "POST",
        body: {
            action: "fetch",
            module: "outr_snts",
            page,
            ...buildTableRequestBody(
                preferences
            ),
        },
        params: { ...params }
    });
}

export const getTodayPaymentReminderStats = () =>
    http({
        method: "POST",
        body: {
            action: "fetch",
            module: "outr_snts",
            date_range: "today",
            date_field: "scheduled_time",
            filters: {
                ui_name: "payment",
                status: "Pending",
            },
            fields: ["id", "ui_name", "scheduled_time", "status"],
            page: 1,
            per_page: 1,
        },
    });

export const getReminderStats = (
    { filters = {}, email }
) => {
    const params = email ? { email } : {}

    return http({
        method: "POST",
        params: { ...params },
        body: {
            action: "get_stats",
            ...buildTableRequestBody(filters),

            queries: [
                {
                    key: "Sent",
                    module:
                        "outr_snts",

                    filters: {
                        status:
                            "Sent",
                    },
                },
                {
                    key: "Pending",
                    module:
                        "outr_snts",

                    filters: {
                        status:
                            "Pending",
                    },
                },
                {
                    key: "cancel",
                    module:
                        "outr_snts",

                    filters: {
                        status:
                            "cancel",
                    },
                },
                {
                    key: "all",
                    module:
                        "outr_snts",
                },

            ],
        },
    });

}

