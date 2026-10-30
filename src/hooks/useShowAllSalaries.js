import { useSyncExternalStore } from "react";
import { salaryVisibility } from "../utils/salaryVisibility";

/** True while an admin has "Show all amounts" on. */
export const useShowAllSalaries = () => useSyncExternalStore(salaryVisibility.subscribe, salaryVisibility.getShowAll);
