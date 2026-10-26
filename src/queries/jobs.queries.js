import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyToJob, fetchJobApplications, fetchJobPostings, fetchJobStatusCounts, updateJobStatus } from "../components/pages/jobs/jobsApi";

/**
 * Query Keys — shared by the Jobs pages and the candidate dashboard, so a
 * list fetched on one screen is already there when the next one opens.
 */
export const jobsKeys = {
  postings: ["job-postings"],
  statusCounts: ["job-postings", "status-counts"],
  applications: (candidateId) => ["candidate-applications", candidateId],
};

export function useJobPostings() {
  return useQuery({
    queryKey: jobsKeys.postings,
    queryFn: fetchJobPostings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useJobStatusCounts({ enabled = true } = {}) {
  return useQuery({
    queryKey: jobsKeys.statusCounts,
    queryFn: fetchJobStatusCounts,
    enabled,
  });
}

/** Switches a posting between active and inactive, updating the list at once. */
export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => updateJobStatus(id, status),
    onSuccess: (_response, { id, status }) => {
      queryClient.setQueryData(jobsKeys.postings, (previous) => previous && {
        ...previous,
        records: previous.records.map((job) => (job.id === id ? { ...job, status } : job)),
      });
    },
    // Both the list and the totals live under the postings key.
    onSettled: () => queryClient.invalidateQueries({ queryKey: jobsKeys.postings }),
  });
}

export function useCandidateApplications(candidateId, { enabled = true } = {}) {
  return useQuery({
    queryKey: jobsKeys.applications(candidateId),
    queryFn: () => fetchJobApplications(candidateId),
    enabled: Boolean(candidateId) && enabled,
  });
}

/** Applies and writes the returned list straight into the cache, so every screen updates at once. */
export function useApplyToJob(candidate) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId) => applyToJob(candidate, jobId),
    onSuccess: (records) => {
      queryClient.setQueryData(jobsKeys.applications(candidate?.id), (previous) => ({
        records,
        dropdowns: previous?.dropdowns || {},
      }));
    },
  });
}
