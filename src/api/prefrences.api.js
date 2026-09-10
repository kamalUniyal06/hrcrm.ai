import { employeSidebar } from "@/services/utils";
import { apiRequest, http } from "../services/api";

const METADATA_ENDPOINT = "https://kartikey.hrcrm.ai/index.php";

export const fetchLayout = async () => {
    // const data = await apiRequest({
    //     endpoint: METADATA_ENDPOINT,
    //     params: {
    //         entryPoint: "flexibility",
    //         global_component_name: "Sidebar",
    //         _: Date.now(),
    //     },
    // });

    return employeSidebar ?? {};
};

export const fetchSidebarComponentId = async () => {
    const response = await http({
        endpoint: METADATA_ENDPOINT,
        method: "POST",
        body: {
            action: "fetch",
            module: "outr_global_component",
            order_by: "",
            filters: { name: "Sidebar" },
            per_page: 1,
        },
    });

    const id = response?.records?.[0]?.id;

    if (response?.success !== true || !id) {
        throw new Error("The Sidebar global component could not be found.");
    }

    return id;
};

/**
 * Return the modules installed in the current CRM.
 *
 * SmartGateway reads SuiteCRM's bean registry for this list, so the editor
 * only offers modules that really exist in the connected CRM. The selected
 * key is later saved to outr_ui_modules.fetch_from through SmartGateway.
 */
export const fetchCrmModules = async () => {
    const response = await http({
        endpoint: METADATA_ENDPOINT,
        method: "POST",
        body: {
            action: "list_modules",
            order_by: "",
        },
    });

    if (response?.success !== true || !Array.isArray(response.modules)) {
        throw new Error("The CRM module list could not be loaded.");
    }

    return response.modules
        .filter((entry) => entry?.module?.trim())
        .map((entry) => ({
            value: entry.module,
            label: String(entry.label || entry.module),
        }))
        .sort((left, right) =>
            left.label.localeCompare(right.label, undefined, {
                numeric: true,
                sensitivity: "base",
            }),
        );
};

export const updateLayout = async ({
    action = "update",
    module,
    id,
    payload,
}) => {
    if (action === "update" && !id) {
        throw new Error(`Layout update failed for ${module}: a record id is required`);
    }

    const response = await http({
        endpoint: METADATA_ENDPOINT,
        method: "POST",
        body: {
            order_by: "",
            action,
            module,
            ...(id ? { id } : {}),
            data: payload,
        },
    });

    /**
     * smart_gateway answers 200 even when the update did not
     * happen, so the status code alone means nothing.
     *
     * A successful update returns:
     *
     *     { success: true, action, module, id }
     *
     * A rejected one returns { success: false, error, code }.
     * And if the handler dies part way through - which is what
     * outr_ui_modules currently does - the body is empty, which
     * would otherwise sail through as a silent no-op.
     */
    if (!response || response.success !== true) {
        const reason =
            response?.error ||
            (response
                ? "unexpected response from smart_gateway"
                : `no response body, the ${module} ${action} handler did not complete`);

        throw new Error(`Layout ${action} failed for ${module}/${id ?? "new"}: ${reason}`);
    }

    return response;
};