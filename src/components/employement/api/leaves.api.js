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

// Admin dashboard feed: intentionally omit employee filters so all leave
// records are returned. The component gates access to administrators.
export const getAllLeaves = async () => {
    const records = [];
    let page = 1;
    let totalPages = 1;
    let metadata = {};
    do {
        const response = await http({
            method: "POST",
            body: { action: "fetch", module: "hrc_leaves", filters: {}, page, per_page: 100 },
        });
        if (response?.success !== true || !Array.isArray(response.records))
            throw new Error(response?.message || response?.error || "Could not load employee leave requests.");
        metadata = response;
        records.push(...response.records.filter((record) => String(record.deleted) !== "1"));
        totalPages = Number(response.total_pages) || 1;
        page += 1;
    } while (page <= totalPages);
    return { ...metadata, records, total: Number(metadata.total) || records.length, total_pages: totalPages };
};

export const updateLeaveStatus = async (id, status) => {
    if (!id) throw new Error("A leave request ID is required.");
    if (!["Accepted", "Rejected"].includes(status)) throw new Error("Choose Accepted or Rejected.");
    const response = await http({
        method: "POST",
        body: { action: "update", module: "hrc_leaves", id, data: { status } },
    });
    if (response?.success !== true) throw new Error(response?.message || response?.error || "Could not update leave request.");
    return response;
};

