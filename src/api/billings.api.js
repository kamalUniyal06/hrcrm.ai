import { http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";

export const getBillingHistory = ({
    preferences,
    page = 1,
}) => {
    return http({
        method: "POST",
        rightee: true,
        body: {
            action: "fetch",
            module: "outr_payments",
            page,
            ...buildTableRequestBody(
                preferences
            ),
        },
    });
}
export const getPaypalKey = () => {
    return http({
        method: "POST",
        rightee: true,
        body: {
            action: "fetch",
            module: "outr_credentials",
            filters: {
                name: "PayPal--Payment"
            }
        },
    });
}
export const getPlans = () => {
    return http({
        method: "POST",
        rightee: true,
        body: {
            action: "fetch",
            module: "outr_plans",
        },
    });
}

