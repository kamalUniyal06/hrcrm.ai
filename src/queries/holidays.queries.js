import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteHoliday, fetchHolidays, saveHoliday } from "../api/holidays.api";
import { leavesKey } from "../components/employement/queries/leaves.queries";

export const holidaysKeys = {
  all: ["holidays"],
};

export const useHolidays = ({ enabled = true } = {}) =>
  useQuery({ queryKey: holidaysKeys.all, queryFn: fetchHolidays, enabled, staleTime: 5 * 60 * 1000 });

// The leave, attendance and home screens read holidays through their own query.
const refreshHolidays = (queryClient) => {
  [holidaysKeys.all, leavesKey.publicHolidays()].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
};

export function useSaveHoliday() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: saveHoliday, onSuccess: () => refreshHolidays(queryClient) });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteHoliday, onSuccess: () => refreshHolidays(queryClient) });
}
