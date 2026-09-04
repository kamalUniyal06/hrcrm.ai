import { useQuery } from "@tanstack/react-query";
import { getGpcTrainingStatus } from "../api/training.api";

export const useGpcTrainingStatus = (email) =>
    useQuery({
        queryKey: ["gpc-training-status", email],
        queryFn: () => getGpcTrainingStatus(email),
        enabled: Boolean(email),
        staleTime: 60 * 1000,
    });