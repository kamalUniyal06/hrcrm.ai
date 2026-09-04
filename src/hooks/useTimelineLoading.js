import { useTimeline } from "../context/TimelineContext";
import { useContact } from "../queries/contact.queries";
import { useDealsByEmail } from "../queries/deals.queries";
import { useInfiniteEmails } from "../queries/email.queries";
import { useInfiniteLedger } from "../queries/ledger.queries";
import { useMailerSummary } from "../queries/mailerSummary.queries";
import { useOffersByEmail } from "../queries/offers.queries";
import { useOrdersByEmail } from "../queries/orders.queries";
import { useThread } from "../queries/threads.queries";
import { useTablePreference } from "./useTablePreference";

export const useTimelineLoading = () => {
    const { currentEmail } = useTimeline();
    const preferences = useTablePreference("emails");
    const emailQuery = useInfiniteEmails(preferences)
    const contactQuery = useContact(currentEmail);
    // const mailerSummaryQuery = useMailerSummary(currentEmail);
    const threadQuery = useThread(currentEmail);
    const ledgerQuery = useInfiniteLedger(currentEmail);
    const dealsQuery = useDealsByEmail(currentEmail);
    const offersQuery = useOffersByEmail(currentEmail);
    const ordersQuery = useOrdersByEmail(currentEmail);
    const isTimelineLoading =
        contactQuery.isLoading ||
        // mailerSummaryQuery.isLoading ||
        threadQuery.isLoading ||
        emailQuery.isLoading ||
        ledgerQuery.isLoading;
    return {
        isTimelineLoading,

        contactLoading:
            contactQuery.isLoading,

        // mailerSummaryLoading:
        //     mailerSummaryQuery.isLoading,

        threadLoading: threadQuery.isLoading,
        emailsLoading: emailQuery.isLoading
        ,
        ledgerLoading:
            ledgerQuery.isLoading,
    };
};