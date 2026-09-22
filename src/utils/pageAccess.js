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
  return /^\/(?:employees|interviews|salaries)(?:\/|$)/i.test(path) ||
    /^\/entity\/hrc_(?:employees|interviews|salaries)(?:\/|$)/i.test(path);
}

export function filterAdminNavigation(groups, isAdmin) {
  if (isAdmin) return groups;
  return groups.map(group => ({
    ...group,
    data: (group.data || []).filter(item => !isAdminPage(sidebarDestination(item))),
  })).filter(group => group.data.length > 0);
}
