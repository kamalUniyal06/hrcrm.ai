import { threadKeys } from "../queries/threads.queries";
import { dealKeys } from "../queries/deals.queries";
import { offerKeys } from "../queries/offers.queries";
import { orderKeys } from "../queries/orders.queries";
import { ledgerKeys } from "../queries/ledger.queries";
import { contactKeys } from "../queries/contact.queries";
import { mailerSummaryKeys } from "../queries/mailerSummary.queries";


import { getDealsByEmail } from "../api/deals.api";
import { getOffersByEmail } from "../api/offers.api";
import { getOrdersByEmail } from "../api/orders.api";
import { getLedger } from "../api/ledger.api";
import { getContactByEmail } from "../api/contact.api";
import { getMailerSummary } from "../api/mailerSummary.api";
import { getThreadByEmail } from "../api/threads.api";
import { invoiceKeys } from "../queries/invoice.queries";
import { getAllInvoice } from "../api/invoice.api";

export const prefetchTimelineData = async (
    queryClient,
    email
) => {
    if (!email) return;

    const threadPromise = queryClient.prefetchQuery({
        queryKey: threadKeys.list(email, ""),
        queryFn: async () => {
            const data = await getThreadByEmail(email);

            const threadId =
                data?.thread_id ||
                data?.threadId ||
                data?.id;

            if (threadId) {
                queryClient.setQueryData(
                    threadKeys.list(
                        email,
                        threadId
                    ),
                    data
                );
            }

            return data;
        },
    });

    return Promise.all([
        threadPromise,

        queryClient.prefetchQuery({
            queryKey: dealKeys.byEmail(email),
            queryFn: () =>
                getDealsByEmail(email),
        }),
        queryClient.prefetchQuery({
            queryKey:
                offerKeys.byEmail(email),
            queryFn: () =>
                getOffersByEmail(email),
        }),
        queryClient.prefetchQuery({
            queryKey:
                invoiceKeys.byEmail(email),
            queryFn: () =>
                getAllInvoice({ preferences: {}, email }),
        }),

        queryClient.prefetchQuery({
            queryKey:
                orderKeys.byEmail(email),
            queryFn: () =>
                getOrdersByEmail(email),
        }),

        queryClient.prefetchInfiniteQuery({
            queryKey:
                ledgerKeys.lists(email),

            queryFn: ({
                pageParam = 1,
            }) =>
                getLedger({
                    email,
                    page: pageParam,
                }),

            initialPageParam: 1,
        }),

        queryClient.prefetchQuery({
            queryKey:
                contactKeys.byEmail(email),
            queryFn: () =>
                getContactByEmail(email),
        }),

        // queryClient.prefetchQuery({
        //     queryKey:
        //         mailerSummaryKeys.byEmail(
        //             email
        //         ),
        //     queryFn: () =>
        //         getMailerSummary(email),
        // }),
    ]);
};