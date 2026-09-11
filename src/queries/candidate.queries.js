import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { findCandidate } from "../components/pages/profile/candidateApi";

export const candidateKey = email => ["candidate-profile", email];

export function useCandidateProfile() {
  const email = useSelector(state => state.user.user?.email)?.trim() || "";
  return useQuery({
    queryKey: candidateKey(email),
    queryFn: () => findCandidate(email),
    enabled: Boolean(email),
    staleTime: 0,
  });
}
