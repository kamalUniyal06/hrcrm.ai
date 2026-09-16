export function sidebarDestination(item) {
  const name = String(item.name || "").trim();
  if (/^short[\s-]?listed(?:\s+candidates)?$/i.test(name)) return "/shortlisted";
  if (/^candidates?$/i.test(name)) return "/candidates";
  if (/^(my\s+)?profile$/i.test(name)) return "/profile";
  if (/^job[\s-]+post(?:ing)?s?$/i.test(name)) return "/job-posting";
  if (/^(?:my\s+)?(?:job[\s-]+)?applications?$/i.test(name)) return "/job-application";
  if (/^settings?$/i.test(name)) return "/settings";
  const navigation = String(item.navigation || "").trim().replace(/^\/+/, "");
  if (navigation && !/^profile(?:[/?#]|$)/i.test(navigation)) return `/${navigation}`;
  const module = String(item.fetch_from || item.module_name || "").trim();
  return module ? `/entity/${encodeURIComponent(module)}/view` : null;
}
