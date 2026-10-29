import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useMe } from "../queries/hr.queries";
import { areaScope, can, canAtLeast, hasArea, hierarchyLevel, scopeOf } from "../utils/hrAccess";
import { selectIsAdmin } from "../utils/pageAccess";

/**
 * Access helpers bound to the current user's `me`. Gate features on these, never on the
 * role's category: an admin can give any role any scope.
 */
export function useHrAccess() {
  const me = useMe();
  const isAdmin = useSelector(selectIsAdmin);
  const capabilities = me.data?.capabilities;
  const areas = me.data?.areas;

  return useMemo(() => ({
    me,
    loading: me.isPending && me.fetchStatus !== "idle",
    isAdmin,
    level: hierarchyLevel(capabilities, { isAdmin }),
    scopeOf: (area, action) => scopeOf(capabilities, area, action),
    canAtLeast: (area, action, min) => canAtLeast(capabilities, area, action, min),
    can: (area, action) => can(capabilities, area, action),
    hasArea: (module) => hasArea(areas, module),
    areaScope: (module, kind) => areaScope(areas, module, kind),
  }), [me, isAdmin, capabilities, areas]);
}

/** The highest hierarchy level the user reaches: Employee, Team lead, Manager, Department head, HR or admin. */
export const useHierarchyLevel = () => useHrAccess().level;
