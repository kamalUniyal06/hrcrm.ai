import { createContext, useContext } from "react";

export const RecruitmentContext = createContext(null);
export function useRecruitment() {
  const context = useContext(RecruitmentContext);
  if (!context) throw new Error("RecruitmentProvider is required.");
  return context;
}
