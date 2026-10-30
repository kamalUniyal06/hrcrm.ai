export function sidebarDestination(item) {
  const name = String(item.name || "").trim();
  if (/^(?:my\s+)?increment\s+requests?$/i.test(name) || /^\/?increment-request\/?$/i.test(String(item.navigation || "").trim())) return "/increment-request";
  if (/^increment(?:s|\s+management)?$/i.test(name) || ["hrc_increment", "hrc_increment_questions", "hrc_increment_replies"].includes(String(item.fetch_from || item.module_name || "").trim())) return "/increment-management";
  if (/^system[\s-]+alerts?$/i.test(name) || ["hrc_system_alert", "hrc_employee_response"].includes(String(item.fetch_from || item.module_name || "").trim())) return "/system-alerts";
  if (/^quotations?(?:\s+alerts?)?$/i.test(name) || String(item.fetch_from || item.module_name || "").trim() === "hrc_quotations") return "/quotations";
  if (/^(?:offboarding|(?:employee\s+)?exits?)(?:\s+management)?$/i.test(name) || String(item.fetch_from || item.module_name || "").trim() === "hrc_resignation") return "/exit";
  if (/^(?:salary|salaries)(?:\s+management)?$/i.test(name) || String(item.fetch_from || item.module_name || "").trim() === "hrc_salaries") return "/salaries";
  if (/^employees?$/i.test(name) || String(item.fetch_from || item.module_name || "").trim() === "hrc_employees") return "/employees";
  if (/^short[\s-]?listed(?:\s+candidates)?$/i.test(name)) return "/shortlisted";
  if (/^candidates?$/i.test(name)) return "/candidates";
  if (/^(my\s+)?profile$/i.test(name)) return "/profile";
  if (/^job[\s-]+post(?:ing)?s?$/i.test(name)) return "/job-posting";
  if (/^(?:my\s+)?(?:job[\s-]+)?applications?$/i.test(name)) return "/job-application";
  if (/^settings?$/i.test(name)) return "/settings";
  const navigation = String(item.navigation || "").trim().replace(/^\/+/, "");
  if (navigation && !/^profile(?:[/?#]|$)/i.test(navigation)) return `/${navigation}`;
  const module = String(item.fetch_from || item.module_name || "").trim();
  if (HR_AREA_ROUTES[module.toLowerCase()]) return HR_AREA_ROUTES[module.toLowerCase()];
  return module ? `/entity/${encodeURIComponent(module)}/view` : null;
}

// Areas added by the HR installer have no `navigation` value; these have their own screens.
const HR_AREA_ROUTES = {
  outr_notification: "/notifications",
  hrc_hr_appointments: "/hr-appointments",
  hrc_hr_availability: "/hr-appointments/availability",
  // An employee's own career timeline lives on their profile.
  hrc_employee_timeline: "/profile",
  hrc_salary_structures: "/salaries",
  hrc_leave_transaction: "/my-leaves",
};

// The backend may still name the resignation menu "Offboarding"; the app calls it "Exit".
export function sidebarLabel(item) {
  return String(item?.name ?? "").replace(/off[\s-]?boarding/gi, (word) => (word[0] === "O" ? "Exit" : "exit"));
}
