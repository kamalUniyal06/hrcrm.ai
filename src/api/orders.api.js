// orders.api.js

import { fetchGpc, http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";


export const getAllOrders = ({
    preferences,
    page = 1,
    email = "",
}) => {
    const params = email ? { email } : {}

    return http({
        method: "POST",
        body: {
            "action": "fetch",
            "module": "outr_order_gp_li",
            page,
            ...buildTableRequestBody(
                preferences
            ),
        },
        params: { ...params }
    });

}

export const getOrderById = (
    id
) =>
    http({
        method: "POST",
        body: {
            "action": "fetch",
            "module": "outr_order_gp_li", filters: { id }
        },
    });

export const createOrder = (
    order
) =>
    http({
        method: "POST",
        params: {
            action:
                "createOrder",
        },
        body: order,
    });

export const updateOrder = ({
    order,
}) =>
    http({
        method: "POST",
        params: {
            action:
                "updateOrder",
        },
        body: order,
    });

export const getOrderStats = (
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
                    "key": "new",
                    "module": "outr_order_gp_li",
                    sum_of: ['total_amount_c'],
                    "filters": {
                        "order_status": "new"
                    }
                },
                {
                    "key": "accepted",
                    "module": "outr_order_gp_li",
                    sum_of: ['total_amount_c'],

                    "filters": {
                        "order_status": "accepted"
                    }
                },
                {
                    "key": "pending",
                    "module": "outr_order_gp_li",
                    sum_of: ['total_amount_c'],

                    "filters": {
                        "order_status": "pending"
                    }
                },
                {
                    "key": "wrong",
                    "module": "outr_order_gp_li",
                    sum_of: ['total_amount_c'],

                    "filters": {
                        "order_status": "wrong"
                    }
                },
                {
                    "key": "completed",
                    "module": "outr_order_gp_li",
                    sum_of: ['total_amount_c'],

                    "filters": {
                        "order_status": "completed"
                    }
                },
                {
                    "key": "rejected_nontechnical",
                    "module": "outr_order_gp_li",
                    sum_of: ['total_amount_c'],

                    "filters": {
                        "order_status": "rejected_nontechnical"
                    }
                },
                {
                    "key": "marketplace",
                    "module": "outr_order_gp_li",
                    sum_of: ['total_amount_c'],

                    "filters": {
                        "order_type": "Marketplace"
                    }
                },
                {
                    "key": "listacle",
                    "module": "outr_order_gp_li",
                    sum_of: ['total_amount_c'],

                    "filters": {
                        "order_status": "listacle"
                    }
                },
                {
                    "key": "all",
                    "module": "outr_order_gp_li"
                },
            ]
        },
    });
}
export const getOrdersByMessageId = ({ email, message_id }) => fetchGpc({ params: { type: "sync_opr" }, body: { email, message_id, sync_type: "order" }, method: "POST" })
export const getOrdersByEmail = (
    email
) =>
    fetchGpc({
        params: {
            type: "get_orders",
            email,
            page: 1,
            page_size: 50,
        },
    });