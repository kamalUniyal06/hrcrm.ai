import { fetchGpc, http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";


export const getAllDeals = ({
    preferences,
    page = 1,
    email = ""
}) => {
    const params = email ? { email } : {}
    return http({
        method: "POST",
        body: {
            "action": "fetch",
            "module": "outr_deal_fetch",
            "fields": ["first_name", "last_name", "email", "status", "date_entered", "website_c", "thread_id", "message_id", "dealamount", "note", "date_modified"],
            "page": page,
            "per_page": 20,
            ...buildTableRequestBody(preferences)
        },
        params: { ...params }
    });
}


export const getDealStats = ({ filters, email }) => {
    const params = email ? { email } : {}

    return http({
        method: "POST",
        params: { ...params },
        body: {
            action: "get_stats",
            ...buildTableRequestBody(filters),
            queries: [
                {
                    "key": "active",
                    "module": "outr_deal_fetch",
                    sum_of: ['dealamount'],
                    "filters": {
                        "status": "active"
                    }
                },
                {
                    "key": "expire",
                    "module": "outr_deal_fetch",
                    sum_of: ['dealamount'],
                    "filters": {
                        "status": "expire"
                    }
                },
            ]
        },
    });

}

export const deleteDeal = (
    id
) =>
    http({
        method: "POST",
        params: {
            action: "deleteDeal",
        },
        body: { id },
    });

export const getDealById = (
    id
) =>
    http({
        method: "POST",
        params: {
            action: "getDeal",
        },
        body: { id },
    });
export const getDealsByEmail = (email) => fetchGpc({ params: { type: "get_deals", email, page: 1, page_size: 50 } })
export const getDealsByMessageId = ({ email, message_id }) => fetchGpc({ params: { type: "sync_opr" }, body: { email, message_id, sync_type: "deal" }, method: "POST" })