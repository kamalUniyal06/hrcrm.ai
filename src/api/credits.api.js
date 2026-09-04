import { fetchGpc, http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";

export const getAllCredits = ({
    preferences,
    page = 1,
}) => {
    return http({
        method: "POST",
        body: {
            action: "fetch",
            module: "outr_master_ledger",
            page,
            ...buildTableRequestBody(
                preferences
            ),
        },
    });
}


export const getCreditStats = (
    filters = {}
) => {


    return http({
        method: "POST",
        body: {
            action: "get_stats",
            ...filters,

            queries: [
                {
                    key: "active",
                    module:
                        "outr_offer",

                    filters: {
                        offer_status:
                            "active",
                    },
                },
                {
                    key: "expired",
                    module:
                        "outr_offer",

                    filters: {
                        offer_status:
                            "expired",
                    },
                },
                {
                    key: "accepted",
                    module:
                        "outr_offer",

                    filters: {
                        offer_status:
                            "accepted",
                    },
                },
            ],
        },
    });
}




