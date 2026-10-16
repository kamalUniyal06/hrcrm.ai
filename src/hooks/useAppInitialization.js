import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";

import { preferenceKeys } from "../queries/prefrences.queries";
import { fetchLayout } from "../api/prefrences.api";
import {
    attendanceLimitsKey,
    fetchAttendanceLimits,
} from "../components/employement/attendanceLimits";

export const useAppInitialization =
    () => {

        const queryClient =
            useQueryClient();
        // The router (and this hook) mounts only after auth/me resolves, so the subject type is known here.
        const isCandidate = useSelector((state) => state.user.userInfo?.subject_type === "candidate");

        useEffect(() => {

            Promise.all([

                queryClient.prefetchQuery({
                    queryKey: preferenceKeys.layout(),
                    queryFn: fetchLayout,
                }),

                // Attendance limits only drive employee and admin attendance screens.
                !isCandidate && queryClient.fetchQuery({
                    queryKey: attendanceLimitsKey,
                    queryFn: fetchAttendanceLimits,
                    staleTime: 0,
                }),

            ]);

        }, [queryClient, isCandidate]);
    };
