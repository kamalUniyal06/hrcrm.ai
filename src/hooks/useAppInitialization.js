import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { preferenceKeys } from "../queries/prefrences.queries";
import { fetchLayout } from "../api/prefrences.api";

export const useAppInitialization =
    () => {

        const queryClient =
            useQueryClient();

        useEffect(() => {

            Promise.all([

                queryClient.prefetchQuery({
                    queryKey: preferenceKeys.layout(),
                    queryFn: fetchLayout,
                }),

            ]);

        }, []);
    };