/** Module names for sidebar writes are supplied by the sidebar response. */
export function resolveSidebarModules(response) {
  const nameOf = (record) =>
    typeof record?.module === "string" ? record.module.trim() : "";
  const groups = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : [];
  const groupModules = new Set(
    groups.map(nameOf).filter(Boolean),
  );
  const itemModules = new Set(
    groups.flatMap((group) => (Array.isArray(group?.data) ? group.data : []))
      .map(nameOf)
      .filter(Boolean),
  );

  if (groupModules.size > 1 || itemModules.size > 1) {
    throw new Error("The sidebar response contains conflicting group or item modules.");
  }

  return {
    groupModule: [...groupModules][0] ?? null,
    itemModule: [...itemModules][0] ?? null,
  };
}
