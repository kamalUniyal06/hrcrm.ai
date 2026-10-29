import { useMemo, useState } from "react";
import { Palmtree, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamLeaveBalances } from "../../../queries/hr.queries";
import { normalizeTeamBalances } from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { EmptyState, PersonAvatar, QueryState } from "../org/orgUi";

const days = (value) => (Number.isInteger(value) ? value : value.toFixed(1));
const COLUMNS = [["planned", "Planned"], ["sick", "Sick"], ["total", "Available"], ["usedThisYear", "Used this year"], ["unpaidThisYear", "Unpaid this year"]];

/**
 * Leave balances of everyone in the viewer's leave read scope (optionally narrowed by `scope`),
 * or only the people in `employeeIds` when it is given.
 */
export default function TeamBalancesTable({ scope, employeeIds, onOpenPerson }) {
  const query = useTeamLeaveBalances(scope);
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const all = normalizeTeamBalances(query.data);
    return employeeIds ? all.filter((row) => employeeIds.has(row.employeeId)) : all;
  }, [query.data, employeeIds]);
  const term = search.trim().toLowerCase();
  const visible = term ? rows.filter((row) => `${row.name} ${row.designation}`.toLowerCase().includes(term)) : rows;

  return (
    <div className="space-y-3">
      <label className="relative block max-w-sm">
        <span className="sr-only">Search balances</span>
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or designation"
          className="min-h-11 w-full rounded-lg border border-border bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </label>

      <QueryState query={query} rows={5}>
        {visible.length ? (
          <div className={cn(candidateStyles.card, "overflow-x-auto")}>
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">Leave balances, in days</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-semibold">Employee</th>
                  {COLUMNS.map(([key, label]) => <th key={key} scope="col" className="px-3 py-3 text-right font-semibold">{label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((row) => (
                  <tr key={row.employeeId}>
                    <th scope="row" className="px-4 py-2 text-left font-normal">
                      <button
                        type="button"
                        onClick={() => onOpenPerson?.({ id: row.employeeId, name: row.name, designation: row.designation })}
                        disabled={!onOpenPerson}
                        className="flex min-h-11 items-center gap-3 rounded-lg text-left enabled:hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <PersonAvatar person={row} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-foreground">{row.name}</span>
                          {row.designation && <span className="block truncate text-xs text-muted-foreground">{row.designation}</span>}
                        </span>
                      </button>
                    </th>
                    {COLUMNS.map(([key]) => (
                      <td key={key} className="px-3 py-2 text-right tabular-nums text-foreground">
                        {days(row[key])}
                        {key === "total" && row.total <= 0 && <span className="ml-1.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">None left</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Palmtree} title={term ? "Nobody matches that search" : "No balances to show"}>
            {term ? "Try a different name." : "Balances appear here for the people in your leave access."}
          </EmptyState>
        )}
      </QueryState>
    </div>
  );
}
