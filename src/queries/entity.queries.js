import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOne } from "../api/entity.api";
import { entityKeys } from "@/hooks/useEntity";

export function useUpdateEntity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            entity,
            module,
            id,
            payload,
        }) => {
            return updateOne(
                module,
                id,
                payload
            );
        },

        onSuccess: (
            data,
            variables
        ) => {
            const {
                entity,
                id,
            } = variables;

            // Refresh entity queries
            queryClient.invalidateQueries({
                queryKey: entityKeys.allByEntity(entity),
            });
        },
    });
}