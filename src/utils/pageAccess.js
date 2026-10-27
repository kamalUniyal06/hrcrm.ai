import { sidebarDestination } from "./sidebarNavigation.js";

export const selectIsAdmin = (state) =>
  state.user.isAuthenticated === true && state.user.userInfo?.status === "admin";

export function isAdminPage(pathname = "") {
  let path = String(pathname).split(/[?#]/)[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    // Malformed paths cannot resolve to a protected route.
  }
  return /^\/(?:employees|candidates|limit-management|salaries|exit|offboarding|system-alerts|quotations|leave-approvals|increment-management)(?:\/|$)/i.test(path) ||
    /^\/entity\/hrc_(?:employees|salaries|increment|increment_questions|increment_replies)(?:\/|$)/i.test(path);
}

// Pages everyone can open, whose admin version is the management tool (candidates browse
// and apply on /job-posting; admins create and delete postings there).
export function hasAdminView(pathname = "") {
  return /^\/job-posting(?:\/|$)/i.test(String(pathname).split(/[?#]/)[0]);
}

export function filterAdminNavigation(groups, isAdmin) {
  if (isAdmin) return groups;
  return groups.map(group => ({
    ...group,
    data: (group.data || []).filter(item => !isAdminPage(sidebarDestination(item))),
  })).filter(group => group.data.length > 0);
}

// Admins manage the shortlist and interviews inside /candidates, so those links are redundant.
const MERGED_INTO_CANDIDATES = /^\/(?:shortlisted|interviews)\/?$/i;
export function hideMergedRecruitmentNavigation(groups, isAdmin) {
  if (!isAdmin) return groups;
  return groups.map(group => ({
    ...group,
    data: (group.data || []).filter(item => !MERGED_INTO_CANDIDATES.test(String(sidebarDestination(item) || "").split(/[?#]/)[0])),
  })).filter(group => group.data.length > 0);
}
