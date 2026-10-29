import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePeople } from "../../../queries/hr.queries";
import { useHrAccess } from "../../../hooks/useHrAccess";
import { scopeOptions } from "../../../utils/hrAccess";
import { personName, personTitle } from "../../../utils/hrOrg";
import { recordsOf } from "../../../utils/hrRecords";
import { CandidatePageHeader } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { EmptyState, PersonButton, QueryState, Segmented } from "../org/orgUi";
import LeaveCodesPanel from "./LeaveCodesPanel";
import PayOverview from "./PayOverview";
import TeamBalancesTable from "./TeamBalancesTable";
import TeamMemberDrawer from "./TeamMemberDrawer";

// The scope chosen on a list, kept only while it is still one of the options.
const pick = (wanted, options) => (options.some((option) => option.id === wanted) ? wanted : options.at(-1)?.id);

// "Direct reports" is not a backend scope: it lists `me.direct_reports` instead of calling `people`.
const DIRECT = "direct";

function People({ scopes, directReports, onOpenPerson }) {
  const [wanted, setWanted] = useState(null);
  const [search, setSearch] = useState("");
  const scope = pick(wanted, scopes);
  const direct = scope === DIRECT;
  const peopleQuery = usePeople(scope, { enabled: Boolean(scope) && !direct });
  const query = direct ? { isPending: false, isError: false, data: directReports } : peopleQuery;
  const people = useMemo(() => recordsOf(query.data, ["people", "records", "data"]), [query.data]);
  const term = search.trim().toLowerCase();
  const visible = term
    ? people.filter((person) => `${personName(person)} ${personTitle(person)} ${person.email ?? ""}`.toLowerCase().includes(term))
    : people;

  if (!scope) {
    return (
      <EmptyState icon={Users} title="Your role has no access to other people's records">
        Ask HR or your admin to give your access role "My team" or wider on Employees.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {scopes.length > 1 && (
          <Segmented label="Whose records" options={scopes.map((option) => [option.id, option.label])} value={scope} onChange={setWanted} />
        )}
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
      </div>

      <QueryState query={query} rows={5}>
        {visible.length ? (
          <>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              <span className="tabular-nums">{visible.length}</span> {visible.length === 1 ? "person" : "people"}
            </p>
            <ul className={cn(candidateStyles.card, "grid gap-1 p-2 sm:grid-cols-2 xl:grid-cols-3")} data-tour="team-people">
              {visible.map((person) => (
                <li key={person.id}><PersonButton person={person} onOpen={onOpenPerson} /></li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState icon={Users} title={term ? "Nobody matches that search" : "No one here yet"}>
            {term ? "Try a different name." : "Once people are added to your team, they appear here."}
          </EmptyState>
        )}
      </QueryState>
    </div>
  );
}

function Balances({ scopes, onOpenPerson }) {
  const [wanted, setWanted] = useState(null);
  const scope = pick(wanted, scopes);
  return (
    <div className="space-y-4">
      {scopes.length > 1 && (
        <Segmented label="Whose balances" options={scopes.map((option) => [option.id, option.label])} value={scope} onChange={setWanted} />
      )}
      <TeamBalancesTable scope={scope} onOpenPerson={onOpenPerson} />
    </div>
  );
}

/** The people a team lead (or wider) can see: profiles, career timelines and leave balances. */
export default function TeamPage() {
  const access = useHrAccess();
  const capabilities = access.me.data?.capabilities;
  const [params, setParams] = useSearchParams();
  const [person, setPerson] = useState(null);
  const directReports = access.me.data?.direct_reports;
  // Managers (reports scope or wider) can narrow the list to the people who report to them directly.
  const peopleScopes = useMemo(() => {
    const options = scopeOptions(capabilities, "employees");
    const at = options.findIndex((option) => option.id === "reports");
    return at < 0 ? options : [...options.slice(0, at), { id: DIRECT, label: "Direct reports" }, ...options.slice(at)];
  }, [capabilities]);
  // "Own" alone is just your own balance, which /my-leaves already shows.
  const balanceScopes = useMemo(() => scopeOptions(capabilities, "leaves").filter((option) => option.id !== "own"), [capabilities]);
  const tabs = [
    ["people", "People"],
    ...(balanceScopes.length ? [["balances", "Leave balances"]] : []),
    ...(access.canAtLeast("salary", "read", "team") ? [["pay", "Pay"]] : []),
    // Anyone with people below them gives the one-time codes needed to apply for leave.
    ["codes", "Leave codes"],
  ];
  const tab = tabs.some(([id]) => id === params.get("tab")) ? params.get("tab") : "people";
  const show = (next) => setParams(next === "people" ? {} : { tab: next }, { replace: true });

  return (
    <main className={candidateStyles.page}>
      <CandidatePageHeader
        icon={Users}
        eyebrow="Team"
        title="My team"
        description="The people you look after. Open someone to see their career timeline and leave balance."
      />

      {tabs.length > 1 && (
        <div role="tablist" aria-label="My team" className="inline-flex rounded-lg bg-muted p-1" data-tour="team-tabs">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`team-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`team-panel-${id}`}
              onClick={() => show(id)}
              className={cn("min-h-10 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none", tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <section role="tabpanel" id={`team-panel-${tab}`} aria-labelledby={tabs.length > 1 ? `team-tab-${tab}` : undefined}>
        {tab === "balances" ? (
          <Balances scopes={balanceScopes} onOpenPerson={setPerson} />
        ) : tab === "pay" ? (
          <PayOverview />
        ) : tab === "codes" ? (
          <LeaveCodesPanel />
        ) : (
          <People scopes={peopleScopes} directReports={directReports} onOpenPerson={setPerson} />
        )}
      </section>

      <TeamMemberDrawer person={person} onClose={() => setPerson(null)} />
    </main>
  );
}
