import { http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";

/**
 * Get Tags
 */
export const getAllTags = ({
    preferences,
    page = 1,
}) =>
    http({
        method: "POST",
        body: {
            action: "fetch",
            module: "outr_hashtag",
            page,
            ...buildTableRequestBody(
                preferences
            ),
        },
    });

/**
 * Get Single Tag
 */
export const getTagById = (
    id
) =>
    http({
        method: "POST",
        body: {
            action: "get_tag",
            id,
        },
    });

/**
 * Create Tag
 */
export const createTag = (
    tag
) =>
    http({
        method: "POST",
        body: {
            "action": "create",
            "module": "outr_hashtag",          // required — any SuiteCRM module
            "data": {                            // required — fields to set
                ...tag
            }
        },
    });

/**
 * Update Tag
 */
export const updateTag = (tag) => {
    console.log(tag)
    http({
        method: "POST",
        body: {
            "action": "update",
            "module": "outr_hashtag",
            id: tag.id,
            "data": {
                ...tag
            }
        },
    });
}


/**
 * Delete Tag
 */
export const deleteTag = (
    id
) =>
    http({
        method: "POST",
        body: {
            "action": "delete",
            "module": "outr_hashtag",
            id
        },
    });

/**
 * Stats
 */
export const getTagStats = (
    filters = {}
) =>
    http({
        method: "POST",
        body: {
            action: "get_stats",

            ...buildTableRequestBody(filters),

            queries: [
                {
                    key: "all",
                    module:
                        "outr_hashtag",

                },
            ],
        },
    });