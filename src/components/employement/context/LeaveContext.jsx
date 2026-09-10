/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useMemo, useState } from "react";

import { useApplyForLeave } from "../queries/leaves.queries";

const LeaveContext = createContext(null);

const initialBalances = [
  { type: "Annual Leave", available: 15, total: 20, tone: "green" },
  { type: "Sick Leave", available: 10, total: 12, tone: "red" },
  { type: "Other Leave", available: 4, total: 10, tone: "yellow" },
];

const initialHistory = [
  {
    id: 1,
    type: "Sick Leave",
    start: "2026-08-12",
    end: "2026-08-13",
    duration: 2,
    status: "Approved",
  },
  {
    id: 2,
    type: "Annual Leave",
    start: "2026-07-21",
    end: "2026-07-23",
    duration: 3,
    status: "Approved",
  },
  {
    id: 3,
    type: "Other Leave",
    start: "2026-06-14",
    end: "2026-06-14",
    duration: 1,
    status: "Pending",
  },
  {
    id: 4,
    type: "Sick Leave",
    start: "2026-05-02",
    end: "2026-05-03",
    duration: 2,
    status: "Rejected",
  },
];

export function LeaveProvider({ children }) {
  const [balances, setBalances] = useState(initialBalances);
  const [history, setHistory] = useState(initialHistory);
  const [view, setView] = useState("overview");

  const {
    mutate,
    isPending,
    data,
    error,
  } = useApplyForLeave();

  const applyLeave = (request) => {
    mutate(request, {
      onSuccess: () => {
        // Only go back to overview when API succeeds
        setView("overview");
      },
      onError: () => {
        // Stay on the current/apply page
      },
    });
  };

  const value = useMemo(
    () => ({
      balances,
      history,
      view,
      setView,
      applyLeave,
      mutate,
      isPending,
      data,
      error,
    }),
    [
      balances,
      history,
      view,
      mutate,
      isPending,
      data,
      error,
    ],
  );

  return (
    <LeaveContext.Provider value={value}>
      {children}
    </LeaveContext.Provider>
  );
}

export const useLeave = () => {
  const value = useContext(LeaveContext);

  if (!value) {
    throw new Error(
      "useLeave must be used inside LeaveProvider"
    );
  }

  return value;
};