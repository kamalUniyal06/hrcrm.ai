import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveRequest } from "./actionResolver";
import { fetchGpc, http } from "../../../services/api";

export default function useActionMutation() {


    const mutation = useMutation({
        mutationFn: async ({
            action,
            record,
            context,
        }) => {
            const request = action?.request;

            if (!request) {
                throw new Error(
                    "Mutation action requires request configuration"
                );
            }

            if (!request.endpoint) {
                throw new Error(
                    "Mutation action requires endpoint"
                );
            }

            /*
             * Resolve:
             *
             * {id}
             * {client_email}
             * {context.user.id}
             *
             * inside endpoint / params / body
             */
            const resolvedRequest =
                resolveRequest(
                    request,
                    record,
                    context
                );

            const {
                endpoint,
                method = "POST",
                params,
                body,
                headers,
            } = resolvedRequest;

            /*
             * ------------------------------------------------------------
             * SMARTGATEWAY
             * ------------------------------------------------------------
             */

            if (
                endpoint.toLowerCase() === "smartgateway"
            ) {
                return http({
                    method,
                    params,
                    headers,
                    body,
                });
            }

            /*
             * ------------------------------------------------------------
             * FETCH GPC
             * ------------------------------------------------------------
             */

            if (
                endpoint.toLowerCase() === "fetchgpc"
            ) {
                return fetchGpc({
                    method,
                    params,
                    body,
                    headers,
                });
            }

            throw new Error(
                `Unsupported action endpoint: ${endpoint}`
            );
        },


    });

    return mutation;
}