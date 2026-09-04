import { http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";
import axios from "axios";

const BLOG_LINK_EXTRACTOR_API_KEY =
    import.meta.env.VITE_BLOG_LINK_EXTRACTOR_API_KEY ||
    "9lEMZM1wd9vBtoYDxpoYQRdTDPmwCBOClDiCxj06";

export const getAllBacklinks = ({
    preferences,
    page = 1,
}) =>
    http({
        method: "POST",
        body: {
            action: "fetch",
            module: "outr_link_queue",

            page,

            ...buildTableRequestBody(
                preferences
            ),
        },
    });

export const getBacklinkStats = (filters = {}) =>
    http({
        method: "POST",
        body: {
            action: "get_stats",

            ...buildTableRequestBody(filters),

            queries: [
                {
                    key: "dofollow",
                    module:
                        "outr_seo_backlinks",

                    filters: {
                        link_type:
                            "dofollow",
                    },
                },
                {
                    key: "nofollow",
                    module:
                        "outr_seo_backlinks",

                    filters: {
                        link_type:
                            "nofollow",
                    },
                },
                {
                    key: "authoritative",
                    module:
                        "outr_seo_backlinks",

                    filters: {
                        link_type:
                            "authoritative",
                    },
                },
                {
                    key: "all",
                    module:
                        "outr_seo_backlinks",

                },
            ],
        },
    });

export const getLinkRemovalCount = () =>
    http({
        method: "POST",
        body: {
            action: "get_stats",
            date_range: "today",
            date_field: "gp_li_date_c",
            queries: [
                {
                    key: "all",
                    module: "outr_link_queue",
                    filters: { status_c: "Added" },
                },
            ],
        },
    });

export const updateBacklink =
    (backlink) =>
        http({
            method: "POST",
            body: {
                "action": "update",
                "module": "outr_link_queue",
                id: backlink.id,
                data: Object.fromEntries(
                    Object.entries(backlink).filter(([key]) => key !== "id"),
                ),
            },
        });

export const getBacklinkById =
    (id) =>
        http({
            method: "POST",
            body: {
                action: "fetch",
                module: "outr_link_queue",
                filters: { id }
            },
        });

/**
 * Loads the links currently present in a published post. The WordPress API is
 * hosted by the same domain as the source URL, so no domain needs to be stored
 * separately on the CRM record.
 */
export const getExtractedBlogLinks = async (sourceUrl) => {
    console.log("getExtractedBlogLinks", sourceUrl);
    if (!sourceUrl) {
        throw new Error("This record does not have a source URL.");
    }

    let domainUrl;
    try {
        domainUrl = new URL(sourceUrl).origin;
    } catch {
        throw new Error("The source URL is not valid.");
    }

    const response = await axios.get(
        `${domainUrl}/wp-json/blog-link-extractor/v2/links`,
        {
            params: { url: sourceUrl },
            headers: { "X-BLE-API-Key": BLOG_LINK_EXTRACTOR_API_KEY },
        },
    );

    return response.data;
};
