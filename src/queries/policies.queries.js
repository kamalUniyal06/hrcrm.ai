import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPolicies, savePolicy } from "../api/policies.api";

export const policiesKeys = {
  all: ["policies"],
  list: (includeDrafts) => ["policies", "list", includeDrafts ? "with-drafts" : "published"],
};

export const usePolicies = ({ includeDrafts = false } = {}) =>
  useQuery({ queryKey: policiesKeys.list(includeDrafts), queryFn: () => fetchPolicies({ includeDrafts }) });

export function useSavePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: savePolicy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: policiesKeys.all }),
  });
}
