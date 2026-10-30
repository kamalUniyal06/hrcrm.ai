import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeQuotation,
  deleteQuotation,
  fetchQuotationAcknowledgements,
  fetchQuotationAdmins,
  fetchQuotations,
  saveQuotation,
} from "../api/quotations.api";

export const quotationsKeys = {
  all: ["quotations"],
  list: (range = null) => ["quotations", "list", range ? `${range.from}..${range.to}` : "all"],
  acknowledgements: ["quotations", "acknowledgements"],
  admins: ["employees", "admins"],
};

export const useQuotationAcknowledgements = ({ enabled = true } = {}) =>
  useQuery({ queryKey: quotationsKeys.acknowledgements, queryFn: fetchQuotationAcknowledgements, enabled, staleTime: 60 * 1000 });

export function useAcknowledgeQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acknowledgeQuotation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quotationsKeys.acknowledgements }),
  });
}

/** Admins to choose "Paid by" from, and to name who created or paid each quotation. */
export const useQuotationAdmins = ({ enabled = true } = {}) =>
  useQuery({ queryKey: quotationsKeys.admins, queryFn: fetchQuotationAdmins, enabled, staleTime: 10 * 60 * 1000 });

/** Quotations with a work date in `range` ({ from, to }), or all of them. */
export const useQuotations = ({ range = null, enabled = true } = {}) =>
  useQuery({
    queryKey: quotationsKeys.list(range),
    queryFn: () => fetchQuotations(range),
    enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

export function useSaveQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveQuotation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quotationsKeys.all }),
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteQuotation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quotationsKeys.all }),
  });
}
