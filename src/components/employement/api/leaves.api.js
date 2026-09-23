import { http } from "@/services/api";
import { store } from "@/store/store";
import { buildTableRequestBody } from "../../../utils/preferenceStorage";
import { fetchGpc } from "../../../services/api";

export const applyForLeave = async (data) => {
    const formData = new FormData();

    formData.append("email", data.email || "");
    formData.append("leave_type", data.leave_type || "");
    formData.append("status", data.status || "Applied");
    formData.append("leave_from", data.leave_from || "");
    formData.append("leave_to", data.leave_to || "");
    formData.append("leave_days", String(data.leave_days || ""));
    formData.append("description", data.description || "");
    formData.append("candidate_id", data.candidate_id || "");

    if (data.attachment instanceof File) {
        formData.append(
            "attachment",
            data.attachment,
            data.attachment.name
        );
    }

    const response = await fetchGpc({
        endpoint:
            "https://kartikey.hrcrm.ai/index.php?entryPoint=hrc",
        method: "POST",
        params: {
            type: "create_leave",
        },
        body: formData,
    });

    // Backend returned an unsuccessful response
    if (!response?.success) {
        throw new Error(
            response?.message || "Failed to apply for leave."
        );
    }

    return response;
};
export const getLeavesHistory = ({ preferences, page }) =>
    http({
        method: "POST",
        body: {
            action: "fetch",
            module: "hrc_leaves",
            filters: {},
            page,
            ...buildTableRequestBody(
                preferences, { employee_id: store.getState().user.userInfo.id }
            ),
        }

    });

