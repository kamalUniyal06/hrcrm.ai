import { getCrmToken, clearCrmToken } from "../../../services/crmAuth";
import { recruitmentRequest } from "../../../services/recruitmentApi";
import { createCandidateTestLoader } from "./candidateTestData.js";

export const fetchMyTestInvitation = createCandidateTestLoader({
  getToken: getCrmToken,
  clearToken: clearCrmToken,
  request: recruitmentRequest,
});
