import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getMailerSummary,
    regenMailerSummary,
} from "../api/mailerSummary.api";

export const mailerSummaryKeys =
{
    all: [
        "mailer-summary",
    ],

    byThread: (
        { threadId, email }
    ) => [
            "mailer-summary",
            threadId,
            email
        ],
    regen: (
        email
    ) => [
            "regen-summary",
            email,
        ],
};

export const useMailerSummary =
    ({ email, threadId }) =>
        useQuery({
            queryKey: mailerSummaryKeys.byThread({ email, threadId }),
            queryFn: () => getMailerSummary({ email, threadId }),
            enabled: Boolean(email && threadId),
        });
export const useRegenMailerSummary =
    () => {

        const queryClient =
            useQueryClient();

        return useMutation({
            mutationFn:
                regenMailerSummary,

            onSuccess: (_,) => {

                queryClient.invalidateQueries({
                    queryKey:
                        mailerSummaryKeys.all
                });
            },
        });
    };