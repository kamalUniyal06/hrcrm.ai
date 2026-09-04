import { apiRequest, http } from "../services/api";
import { getCRM } from "../services/utils";

/**
 * Get all tags
 */
export const getMarkTags = async () => {
    const data = await http({
        method: "POST",
        body: {
            action: "fetch",
            module: "outr_hashtag",
            filters: { is_locked: "0" },
            page: 1,
            per_page: 50

        },
    });
    console.log("TAGAS", data)
    return data;
};

/**
 * Apply tag to email
 */
export const applyTag = async ({
    email,
    tagId,
}) => {
    const { data } = await api.post(
        "/tags/apply",
        {
            email,
            tag_id: tagId,
        }
    );

    return data;
};