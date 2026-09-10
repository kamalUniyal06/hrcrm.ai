import { apiRequest, http } from "@/services/api";
import { store } from "@/store/store";

export const getDailyActivity = () =>
    http({
        method: "POST",
        body: {
            action: "fetch",
            module: "hrc_daily_activity",
            filters: { name: store.getState().user.user.email },
            date_range: "today",           // today|yesterday|this_week|last_week|this_month|last_month|custom
            date_field: "date_entered",   // default: date_entered

            page: 1,
        },
    });
export const markActivity = (action) =>
    apiRequest({
        endpoint: 'https://flight.hrcrm.ai/index.php?entryPoint=hrc&type=daily_activity',
        headers: { 'X-Api-Key': import.meta.env.VITE_FETCHGPC_X_API_KEY },
        method: "POST",
        body: {
            email: store.getState().user.user.email,
            action: action
        }
    });

