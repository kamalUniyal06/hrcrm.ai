import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { fetchAllRecords } from "../../pages/candidates/candidatesApi";
import { employeeName } from "../../pages/employees/employeesApi";
import {
  getAllResignations,
  updateResignationRecord,
} from "../api/resignation.api";

const RESIGNATIONS_KEY = ["resignations", "offboarding"];
const EMPLOYEES_KEY = ["employees", "list"];
const clean = (value) => String(value ?? "").trim();
const isComplete = (value) => value === true || value === 1 || value === "1";

const APPROVALS = [
  { field: "notify_tl", label: "Team lead" },
  { field: "notify_manager", label: "Manager" },
  { field: "notify_hr", label: "HR" },
];

const CHECKOUT_TASKS = [
  { field: "assets", label: "Assets returned" },
  { field: "kt", label: "Knowledge transfer" },
  { field: "exit_interview", label: "Exit interview" },
  { field: "reviews", label: "Reviews closed" },
  { field: "salary_slip", label: "Salary slip" },
  { field: "decleration_form", label: "Declaration form" },
];

function employeeForRecord(record, employees) {
  const email = clean(record.name).toLowerCase();
  return (
    employees.find(
      (employee) =>
        clean(employee.email1 || employee.email).toLowerCase() === email,
    ) || null
  );
}

function getState(record) {
  const approvalsReady = APPROVALS.every((a) => isComplete(record[a.field]));
  const doneTasks = CHECKOUT_TASKS.filter((t) =>
    isComplete(record[t.field]),
  ).length;
  const completed = approvalsReady && doneTasks === CHECKOUT_TASKS.length;
  const label = completed
    ? "Complete"
    : approvalsReady
      ? "Checkout in progress"
      : "Awaiting approvals";
  const cls = completed
    ? "text-emerald-700"
    : approvalsReady
      ? "text-indigo-700"
      : "text-amber-700";
  return { approvalsReady, doneTasks, completed, label, cls };
}

export default function OffboardingPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const resignations = useQuery({
    queryKey: RESIGNATIONS_KEY,
    queryFn: getAllResignations,
  });
  const employeesQuery = useQuery({
    queryKey: EMPLOYEES_KEY,
    queryFn: () => fetchAllRecords("hrc_employees"),
  });
  const mutation = useMutation({
    mutationFn: ({ id, field, value }) =>
      updateResignationRecord(id, { [field]: value }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: RESIGNATIONS_KEY }),
  });

  const records = resignations.data || [];
  const employees = employeesQuery.data || [];

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const employee = employeeForRecord(record, employees);
      const name = employee ? employeeName(employee) : clean(record.name);
      return (
        !query ||
        [name, record.name, record.status].some((value) =>
          clean(value).toLowerCase().includes(query),
        )
      );
    });
  }, [records, employees, search]);

  const handleTaskChange = (record, field, checked) => {
    mutation.mutate({ id: record.id, field, value: checked ? "1" : "0" });
  };

  if (resignations.isPending || employeesQuery.isPending) {
    return (
      <main className="grid min-h-0 flex-1 place-items-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" />
          Loading offboarding records…
        </span>
      </main>
    );
  }

  if (resignations.isError) {
    return (
      <main className="p-4">
        <div
          role="alert"
          className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <p>
            {resignations.error?.message ||
              "Could not load offboarding records."}
          </p>
          <button
            type="button"
            onClick={() => resignations.refetch()}
            className="mt-1 font-semibold underline"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const busy = mutation.isPending ? mutation.variables : null;
  const th =
    "whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600";
  const td = "border-b border-slate-100 px-3 py-2 text-xs text-slate-700";

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-full flex-1 flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">
          Employee offboarding
        </h1>
        <div className="flex items-center gap-2">
          <label className="relative block">
            <span className="sr-only">Search employees</span>
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="w-56 rounded border border-slate-300 py-1.5 pl-8 pr-2 text-xs outline-none focus:border-indigo-500"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              resignations.refetch();
              employeesQuery.refetch();
            }}
            disabled={resignations.isFetching || employeesQuery.isFetching}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={resignations.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      {mutation.isError && (
        <p
          role="alert"
          className="shrink-0 rounded bg-rose-50 p-2 text-xs text-rose-700"
        >
          {mutation.error?.message || "Could not save checklist update."}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-200 bg-white">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={th}>Employee</th>
              <th className={th}>Notice</th>
              <th className={th}>Submitted</th>
              {APPROVALS.map((a) => (
                <th key={a.field} className={`${th} text-center`}>
                  {a.label}
                </th>
              ))}
              {CHECKOUT_TASKS.map((t) => (
                <th key={t.field} className={`${th} text-center`}>
                  {t.label}
                </th>
              ))}
              <th className={th}>Progress</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    5 + APPROVALS.length + CHECKOUT_TASKS.length
                  }
                  className="p-8 text-center text-xs text-slate-500"
                >
                  {search
                    ? "No matching resignation cases."
                    : "No resignation records found."}
                </td>
              </tr>
            ) : (
              rows.map((record) => {
                const employee = employeeForRecord(record, employees);
                const name = employee
                  ? employeeName(employee)
                  : clean(record.name) || "Employee";
                const email = employee?.email1 || record.name || "";
                const state = getState(record);

                return (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className={td}>
                      <div className="font-medium text-slate-900">{name}</div>
                      <div className="text-[11px] text-slate-500">{email}</div>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {record.notice_period
                        ? `${record.notice_period} days`
                        : "-"}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {record.date_entered_uni_format ||
                        record.date_entered ||
                        "-"}
                    </td>

                    {APPROVALS.map((a) => (
                      <td key={a.field} className={`${td} text-center`}>
                        {isComplete(record[a.field]) ? (
                          <span className="font-semibold text-emerald-700">
                            Verified
                          </span>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>
                    ))}

                    {CHECKOUT_TASKS.map((t) => {
                      const saving =
                        busy?.id === record.id && busy?.field === t.field;
                      return (
                        <td key={t.field} className={`${td} text-center`}>
                          {saving ? (
                            <Loader2
                              size={14}
                              className="mx-auto animate-spin text-slate-500"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={isComplete(record[t.field])}
                              disabled={!state.approvalsReady || Boolean(busy)}
                              title={
                                state.approvalsReady
                                  ? t.label
                                  : "Available after all approvals are verified"
                              }
                              onChange={(e) =>
                                handleTaskChange(
                                  record,
                                  t.field,
                                  e.target.checked,
                                )
                              }
                              className="h-4 w-4 cursor-pointer accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          )}
                        </td>
                      );
                    })}

                    <td className={`${td} whitespace-nowrap`}>
                      {state.doneTasks}/{CHECKOUT_TASKS.length}
                    </td>
                    <td
                      className={`${td} whitespace-nowrap font-semibold ${state.cls}`}
                    >
                      {state.label}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}