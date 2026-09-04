import { fetchGpc } from "../services/api";

export const getLiveSearchData = (search) => fetchGpc({ params: { type: 'live_search', query: search } })