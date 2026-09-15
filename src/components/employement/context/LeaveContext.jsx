/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useMemo, useState } from "react";

import { useApplyForLeave } from "../queries/leaves.queries";
import { useUserInfo } from "@/queries/users.queries";

const LeaveContext = createContext(null);

export function LeaveProvider({ children }) {
  const {
    data: userInfo,
    isLoading: leaveBalanceIsLoading,
  } = useUserInfo();

  const [history, setHistory] = useState([]);
  const [view, setView] = useState("overview");

  const {
    mutate,
    isPending,
    data,
    error,
  } = useApplyForLeave();

  const employee = userInfo?.records?.[0];

  const balances = useMemo(() => {
    if (!employee) {
      return [];
    }

    return [
      {
        type: "Annual Leave",
        available: Number(employee.available_planned_leaves || 0),
        total: Number(employee.available_planned_leaves || 0),
        tone: "green",
      },
      {
        type: "Sick Leave",
        available: Number(employee.available_sick_leaves || 0),
        total: Number(employee.available_sick_leaves || 0),
        tone: "red",
      },
    ];
  }, [employee]);

  const applyLeave = (request) => {
    mutate(request, {
      onSuccess: () => {
        setView("overview");
      },
      onError: () => {
        // Stay on current page
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
      leaveBalanceIsLoading,
    }),
    [
      balances,
      history,
      view,
      mutate,
      isPending,
      data,
      error,
      leaveBalanceIsLoading,
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
    throw new Error("useLeave must be used inside LeaveProvider");
  }

  return value;
};