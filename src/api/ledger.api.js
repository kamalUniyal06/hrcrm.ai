
import { fetchGpc } from "../services/api";
export const getLedger = async ({ email, page = 1 }) => await fetchGpc({ params: { type: 'get_card_ledger', email, page, page_size: "10" } })
export const getChildLedger = async ({ page = 1, parentId }) => await fetchGpc({ params: { type: 'timeline_ledger', page, page_size: "10" }, method: "POST", body: { id: parentId } });

export const getBrandLedger = async ({ email, page = 1 }) => await fetchGpc({ params: { type: "brandTimeline", case: "timeline", email, page, page_size: "10" } })
