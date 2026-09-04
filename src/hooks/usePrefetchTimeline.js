import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchTimelineData } from "../services/prefetchTimelineData";



export const usePrefetchTimeline = (
    emails = [],
    currentEmail = ""
) => {
    const queryClient =
        useQueryClient();
    useEffect(() => {
        if (
            !emails?.length ||
            !currentEmail
        ) {
            return;
        }

        const currentIndex =
            emails.findIndex(
                (email) =>
                    email.email1 ===
                    currentEmail
            );

        if (
            currentIndex === -1
        ) {
            return;
        }

        const nextEmail =
            emails[
                currentIndex + 1
            ]?.email1;

        const previousEmail =
            emails[
                currentIndex - 1
            ]?.email1;
        prefetchTimelineData(
            queryClient,
            nextEmail
        );

        prefetchTimelineData(
            queryClient,
            previousEmail
        );
    }, [
        emails,
        currentEmail,
        queryClient,
    ]);
};