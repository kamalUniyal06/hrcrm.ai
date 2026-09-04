import { http } from "../services/api";

/**
 * Gets the logged-in user's completed GPC training count and the current
 * number of "7 Days" tour records from Rightee CRM.
 * `description` is the email field and `training_number` is the progress field
 * on the `outr_gpc_users` module.
 */
export const getGpcTrainingStatus = async (email) => {
    if (!email) return null;

    const [userResponse, tourResponse] = await Promise.all([
        http({
            method: "POST",
            rightee: true,
            body: {
                action: "fetch",
                module: "outr_gpc_users",
                fields: ["training_number"],
                filters: { description: email },
                page: 1,
                per_page: 1,
            },
        }),
        http({
            method: "POST",
            rightee: true,
            body: {
                action: "fetch",
                module: "outr_gpc_tour",
                fields: ["id"],
                filters: { type: "7_days" },
                page: 1,
                per_page: 1,
            },
        }),
    ]);

    const record = userResponse?.records?.[0];
    if (!record) return null;

    const completedCount = Number(record.training_number);
    const totalCount = Number(tourResponse?.total);

    return {
        completedCount: Number.isFinite(completedCount) ? completedCount : 0,
        totalCount: Number.isFinite(totalCount) ? totalCount : null,
    };
};
