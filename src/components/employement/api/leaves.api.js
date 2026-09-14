import { apiRequest, http } from "@/services/api";
import { store } from "@/store/store";
import { buildTableRequestBody } from "../../../utils/preferenceStorage";

export const applyForLeave = (data) =>
    http({
        method: "POST",
        body: {
            action: "create",
            module: "hrc_leaves",
            data: {
                ...data,
                employee_id: store.getState().user.userInfo.id

            }
        }

    });
export const getLeavesHistory = ({ preferences, page }) =>
    http({
        method: "POST",
        body: {
            action: "fetch",
            module: "hrc_leaves",
            filters: { employee_id: store.getState().user.userInfo.id },
            page,
            ...buildTableRequestBody(
                preferences
            ),
        }

    });

