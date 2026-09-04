import { fetchGpc, http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";

export const getAllOffers = ({
    preferences,
    page = 1,
    email
}) => {
    const params = email ? { email } : {}
    return http({
        method: "POST",
        body: {
            action: "fetch",
            module: "outr_offer",
            contact_information: "name",
            fields: [
                "name",
                "email_c",
                "offer_status",
                "date_entered",
                "website",
                "thread_id",
                "message_id",
                "note",
                "date_modified",
                "our_offer_c",
                "client_offer_c",
                "expiry_date",
            ],
            page,
            ...buildTableRequestBody(
                preferences
            ),
        },
        params: { ...params }
    });
}


export const getOfferStats = (
    { filters = {}, email = '' }
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


export const deleteOffer = (
    id
) =>
    http({
        method: "POST",
        body: {
            action:
                "delete_offer",
            id,
        },
    });

export const getOfferById = (
    id
) =>
    http({
        method: "POST",
        body: {
            action:
                "get_offer",
            id,
        },
    });
export const getOffersByEmail = (
    email
) =>
    fetchGpc({
        params: {
            type: "get_offers",
            email,
            page: 1,
            page_size: 50,
        },
    });