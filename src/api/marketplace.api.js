// orders.api.js

import { queryClient } from "../lib/queryClient";
import { fetchGpc } from "../services/api";
import { applyHashtag, buildLedgerItem, createLedgerEntry, updateActivity } from "../services/utils";
export const getMarketPlaces = async () => await fetchGpc({ params: { type: "get_marketplace" } })

export const addMarketPlace = async ({ email, brand = false }) => {
    let domain = brand ? email.split('@')[1] : '';
    const data = await fetchGpc({ method: "POST", params: { type: 'setMarketPlace' }, body: { email, domain } });
    updateActivity(email, "Add To MarketPlace")
    applyHashtag({
        domain: true,
        email: email,
        memo_no: 1,
        method: "GET",
    });
    createLedgerEntry({
        email: email,
        group: "Activity",
        items: [buildLedgerItem({ status: "Marketplace-Added", detail: `email: {${email}}` })],
    });
    return data

};
export const removeMarketPlace = async ({ email, domain }) => {
    const body = domain ? { domain } : { email }
    const data = await fetchGpc({ method: "POST", params: { type: 'removeMarketPlace' }, body: { ...body } })
    updateActivity(email, "Remove From MarketPlace")
    applyHashtag({
        domain: true,
        email: email,
        memo_no: 1,
        method: "DELETE",
    });
    createLedgerEntry({
        email: email,
        group: "Activity",
        items: [buildLedgerItem({ status: "Marketplace-Removed", detail: `email: {${email}}` })],
    });
    return data

};
