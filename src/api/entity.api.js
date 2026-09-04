import axios from "axios";
import { fetchGpc, http, smartGateway } from "../services/api";
import { buildTableRequestBody } from "@/utils/preferenceStorage";

const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

export async function fetchList(entity, params) {
    const { endpoint } = getEntityConfig(entity);
    const { data } = await client.get(endpoint, { params });
    return data;
}

export const fetchInfiniteList = async ({
    preferences,
    page = 1,
    email = "",
    module,
    dataFilters = {}
}) => {
    const params = email ? { email } : {}
    return http({
        method: "POST",
        body: {
            "action": "fetch",
            "module": module,
            page,
            ...buildTableRequestBody(
                preferences,
                dataFilters
            ),
        },
        params: { ...params }
    });

}
export const getEntityStats = ({
    stats = [],
    filters = {},
    email = "",
    module
}) => {
    const params = email ? { email } : {};

    const queries = stats.map((stat) => {
        const query = {
            key: stat.key,
            module: module,
            filters: stat.filters ?? {},
        };

        if (stat.amountKey) {
            query.sum_of = [stat.amountKey];
        }

        return query;
    });

    return http({
        method: "POST",

        params,

        body: {
            action: "get_stats",

            ...buildTableRequestBody(filters),

            queries,
        },
    });
};

export async function fetchOne({ request, entity, recordInfo }) {
    if (
        request.endpoint.toLowerCase() === "smartgateway"
    ) {
        const data = await http({
            method: "POST",
            params: { ...recordInfo },
            body: {
                action: "fetch",
                module: entity,
            },
        });
        console.log("data", data)
        return data?.records || [];
    }

    /*
     * ------------------------------------------------------------
     * FETCH GPC
     * ------------------------------------------------------------
     */

    if (
        request.endpoint.toLowerCase() === "fetchgpc"
    ) {
        return fetchGpc({
            method: "GET",
            params: { ...request.params || {}, ...recordInfo || {} },
        });
    }
    throw new Error(
        `Unsupported action endpoint: ${request.endpoint}`
    );
}

export async function createOne(entity, payload) {
    const { endpoint } = getEntityConfig(entity);
    const { data } = await client.post(endpoint, payload);
    return data;
}

export async function updateOne(entity, id, payload) {
    // const { endpoint } = getEntityConfig(entity);
    const { data } = await smartGateway({ method: "POST", body: { action: "update", module: entity, id: id, data: payload } })
    return data;
}

export async function deleteOne(entity, id) {
    const { endpoint } = getEntityConfig(entity);
    await client.delete(`${endpoint}/${id}`);
}