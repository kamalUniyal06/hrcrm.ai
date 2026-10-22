import { createContext, useContext } from "react";

export const SystemAlertsContext = createContext(null);

const FALLBACK = {
  available: false,
  loading: false,
  alerts: [],
  pendingCount: 0,
  blockingCount: 0,
  openAlert: () => {},
  openPending: () => {},
};

// The signed-in employee's alerts and the actions that open the alert popup.
export const useSystemAlerts = () => useContext(SystemAlertsContext) || FALLBACK;
