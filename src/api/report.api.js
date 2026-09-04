import { fetchGpc } from "../services/api";

export const getReports = ({
    preference = {},
    page = 1,
}) => {
    const body = {
        page,
        size: 50,

        category:
            preference?.filters?.category || "",

        phase:
            preference?.filters?.phase || "",

        stage:
            preference?.filters?.stage || "",

        from:
            preference?.date_filter?.date_from?.split(" ")[0] || "",

        from_time:
            preference?.date_filter?.date_from?.split(" ")[1] ||
            "00:00:00",

        to:
            preference?.date_filter?.date_to?.split(" ")[0] || "",

        to_time:
            preference?.date_filter?.date_to?.split(" ")[1] ||
            "23:59:59",
    };

    if (preference?.filters?.report_user_id) {
        body.report_user_id = preference?.filters?.report_user_id;
    }

    return fetchGpc({
        method: "POST",
        params: {
            type: "newReport",
        },
        body,
    });
};
