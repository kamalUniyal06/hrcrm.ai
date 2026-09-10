import { apiRequest, http } from "@/services/api";
import { store } from "@/store/store";

export const applyForLeave = (data) =>
    http({
        method: "POST",
        body: {
            action: "create",
            module: "hrc_leaves",
            data
        }

    });

