import { http } from "../../../services/api";
import { loadCandidateInterviews } from "./candidateInterviewData.js";

export async function fetchMyInterviews(options) {
  try {
    return await loadCandidateInterviews((body) => http({ method: "POST", body }), options);
  } catch (error) {
    if (error?.response?.status === 403) {
      throw new Error("Access to your interview details was denied. Please contact HR if refreshing does not help.");
    }
    throw error;
  }
}
