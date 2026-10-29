import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDepartmentMembers, useLookups, useOrgTree } from "../../../queries/hr.queries";
import { useHrAccess } from "../../../hooks/useHrAccess";
import { buildOrgTree, departmentBreakdown, departmentChoices, personName, personTitle } from "../../../utils/hrOrg";
import { recordsOf } from "../../../utils/hrRecords";
import { CandidatePageHeader } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { EmptyState, PersonButton, QueryState } from "../org/orgUi";
import PayOverview from "../team/PayOverview";
import TeamBalancesTable from "../team/TeamBalancesTable";
import TeamMemberDrawer from "../team/TeamMemberDrawer";

const plural = (count, word, many = `${word}s`) => `${count.toLocaleString()} ${count === 1 ? word : many}`;

function Teams({ query, department, onOpenPerson }) {
  return (
    <QueryState query={query} rows={4}>
      {department ? (
        <div className="space-y-4">
          <div className={cn(candidateStyles.card, "p-3")}>
            {department.head ? (
              <PersonButton person={department.head} onOpen={onOpenPerson} note="Department head" />
            ) : (
              <p className="px-2 py-2 text-sm text-muted-foreground">No department head is set yet.</p>
            )}
          </div>

          {department.teams.length || department.outsideTeams.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-tour="department-teams">
              {department.teams.map((team) => (
                <li key={team.id} className={cn(candidateStyles.card, "flex flex-col gap-2 p-3")}>
                  <div className="flex items-baseline justify-between gap-3 px-2 pt-1">
                    <h3 className="truncate text-sm font-semibold text-foreground">{team.name}</h3>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{plural(team.size, "person", "people")}</span>
                  </div>
                  {team.lead ? (
                    <PersonButton person={team.lead} onOpen={onOpenPerson} note="Team lead" />
                  ) : (
                    <p className="px-2 text-sm text-muted-foreground">No team lead yet</p>
                  )}
                  {team.people.length > 0 && (
                    <details className="group px-2">
                      <summary className="flex min-h-10 cursor-pointer items-center rounded-lg text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        <span className="group-open:hidden">Show {plural(team.people.length, "member")}</span>
                        <span className="hidden group-open:inline">Hide members</span>
                      </summary>
                      <ul className="-mx-2 mt-1 space-y-1">
                        {team.people.map((person) => (
                          <li key={person.id ?? personName(person)}><PersonButton person={person} onOpen={onOpenPerson} /></li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
              {department.outsideTeams.length > 0 && (
                <li className={cn(candidateStyles.card, "flex flex-col gap-1 p-3")}>
                  <div className="flex items-baseline justify-between gap-3 px-2 pt-1 pb-1">
                    <h3 className="text-sm font-semibold text-foreground">Not in a team</h3>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{plural(department.outsideTeams.length, "person", "people")}</span>
                  </div>
                  <ul className="space-y-1">
                    {department.outsideTeams.map((person) => (
                      <li key={person.id ?? personName(person)}><PersonButton person={person} onOpen={onOpenPerson} /></li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          ) : (
            <EmptyState icon={Users} title="No teams in this department yet">
              Teams and their members appear here once HR adds them to this department.
            </EmptyState>
          )}
        </div>
      ) : (
        <EmptyState icon={Building2} title="This department isn't on the org chart">
          Ask HR to check that it still exists and is linked to its teams.
        </EmptyState>
      )}
    </QueryState>
  );
}

function People({ query, people, onOpenPerson }) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const visible = term
    ? people.filter((person) => `${personName(person)} ${personTitle(person)} ${person.email ?? ""}`.toLowerCase().includes(term))
    : people;

  return (
    <div className="space-y-4">
      <label className="relative block w-full max-w-sm">
        <span className="sr-only">Search people</span>
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, designation or email"
          className="min-h-11 w-full rounded-lg border border-border bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </label>

      <QueryState query={query} rows={5}>
        {visible.length ? (
          <>
            <p className="text-xs text-muted-foreground" aria-live="polite">{plural(visible.length, "person", "people")}</p>
            <ul className={cn(candidateStyles.card, "grid gap-1 p-2 sm:grid-cols-2 xl:grid-cols-3")}>
              {visible.map((person) => (
                <li key={person.id}><PersonButton person={person} onOpen={onOpenPerson} /></li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState icon={Users} title={term ? "Nobody matches that search" : "No one in this department yet"}>
            {term ? "Try a different name." : "People appear here once they join the department or one of its teams."}
          </EmptyState>
        )}
      </QueryState>
    </div>
  );
}

/** A department head's view of their department: teams and leads, people, leave balances and pay. */
export default function DepartmentPage() {
  const access = useHrAccess();
  const lookups = useLookups();
  const [params, setParams] = useSearchParams();
  const [person, setPerson] = useState(null);
  // With "all" employees access (HR, admins) any department can be opened, not only your own.
  const everyone = access.isAdmin || access.scopeOf("employees", "read") === "all";
  const choices = useMemo(
    () => departmentChoices({ me: access.me.data, lookups: lookups.data, everyone }),
    [access.me.data, lookups.data, everyone],
  );
  const departmentId = choices.some((choice) => choice.id === params.get("id")) ? params.get("id") : choices[0]?.id;
  const members = useDepartmentMembers(departmentId);
  const tree = useOrgTree();
  const department = useMemo(() => departmentBreakdown(buildOrgTree(tree.data).nodes, departmentId), [tree.data, departmentId]);
  const people = useMemo(() => recordsOf(members.data, ["members", "people"]), [members.data]);
  const memberIds = useMemo(() => new Set(people.map((member) => String(member.id))), [people]);

  const tabs = [
    ["teams", "Teams"],
    ["people", "People"],
    ...(access.canAtLeast("leaves", "read", "dept") ? [["balances", "Leave balances"]] : []),
    ...(access.canAtLeast("salary", "read", "dept") ? [["pay", "Pay"]] : []),
  ];
  const tab = tabs.some(([id]) => id === params.get("tab")) ? params.get("tab") : "teams";
  const update = (changes) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
      return next;
    }, { replace: true });

  const selected = choices.find((choice) => choice.id === departmentId);
  const payNote = everyone
    ? "These totals cover everyone you can see, not only this department."
    : choices.length > 1
      ? "These totals cover all your departments together."
      : undefined;
  const stats = [
    ["People", members.isSuccess ? people.length.toLocaleString() : "–"],
    ["Teams", department ? department.teams.length.toLocaleString() : "–"],
    ["Not in a team", department ? department.outsideTeams.length.toLocaleString() : "–"],
    ["Head", department ? (department.head ? personName(department.head) : "Not set") : "–"],
  ];

  if (everyone && lookups.isPending) {
    return (
      <main className={candidateStyles.page}>
        <QueryState query={lookups} rows={4}>{null}</QueryState>
      </main>
    );
  }

  return (
    <main className={candidateStyles.page}>
      <CandidatePageHeader
        icon={Building2}
        eyebrow="Department"
        title={selected?.name || "My department"}
        description="Every team in the department, who leads it, and the people, leave balances and pay you look after."
      >
        {choices.length > 1 && (
          <label className="flex w-full flex-col text-sm font-semibold text-foreground sm:w-64" data-tour="department-picker">
            Department
            <select
              value={departmentId}
              onChange={(event) => update({ id: event.target.value })}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm font-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {choices.map((choice) => (
                <option key={choice.id} value={choice.id}>{choice.name}{choice.heads ? " (you head it)" : ""}</option>
              ))}
            </select>
          </label>
        )}
      </CandidatePageHeader>

      {!departmentId ? (
        <EmptyState icon={Building2} title="You're not part of a department yet">
          Once HR adds you to a department, or makes you its head, it appears here.
        </EmptyState>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="department-summary">
            {stats.map(([label, value]) => (
              <div key={label} className={cn(candidateStyles.card, "min-w-0 px-4 py-3")}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 truncate text-lg font-semibold tabular-nums text-foreground">{value}</dd>
              </div>
            ))}
          </dl>

          <div role="tablist" aria-label="Department" className="inline-flex max-w-full overflow-x-auto rounded-lg bg-muted p-1" data-tour="department-tabs">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`department-tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`department-panel-${id}`}
                onClick={() => update({ tab: id === "teams" ? null : id })}
                className={cn("min-h-10 shrink-0 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none", tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {label}
              </button>
            ))}
          </div>

          <section role="tabpanel" id={`department-panel-${tab}`} aria-labelledby={`department-tab-${tab}`}>
            {tab === "people" ? (
              <People query={members} people={people} onOpenPerson={setPerson} />
            ) : tab === "balances" ? (
              <QueryState query={members} rows={5}>
                <TeamBalancesTable employeeIds={memberIds} onOpenPerson={setPerson} />
              </QueryState>
            ) : tab === "pay" ? (
              <PayOverview tour="department-pay" note={payNote} />
            ) : (
              <Teams query={tree} department={department} onOpenPerson={setPerson} />
            )}
          </section>
        </>
      )}

      <TeamMemberDrawer person={person} onClose={() => setPerson(null)} />
    </main>
  );
}
