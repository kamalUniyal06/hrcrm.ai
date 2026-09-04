import { useQuery } from "@tanstack/react-query";
import { fetchGpc } from "../services/api";
export const useQuickBtn =
    () =>
        useQuery({
            queryKey: ['quick-btns'],
            queryFn: async () => {
                const data = await fetchGpc({ params: { type: "quick_actions" } })
                return data?.data ?? []
            },

            staleTime:
                5 *
                60 *
                1000,
        });