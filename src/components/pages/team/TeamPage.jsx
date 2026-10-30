import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrgTree, usePeople } from "../../../queries/hr.queries";
import { useHrAccess } from "../../../hooks/useHrAccess";
import { scopeOptions } from "../../../utils/hrAccess";
import { personId, personName, personTitle, teamsOfMe } from "../../../utils/hrOrg";
import { recordsOf } from "../../../utils/hrRecords";
import { CandidatePageHeader } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { EmptyState, PersonButton, QueryState, Segmented } from "../org/orgUi";
import LeaveCodesPanel from "./LeaveCodesPanel";
import TeamBalancesTable from "./TeamBalancesTable";
import TeamMemberDrawer from "./TeamMemberDrawer";

// The scope chosen on a list, kept only while it is still one of the options.
const pick = (wanted, options) => (options.some((option) => option.id === wanted) ? wanted : options.at(-1)?.id);

// "Direct reports" is not a backend scope: it lists `me.direct_reports` instead of calling `people`.
const DIRECT = "direct";
// "My team" is shown team by team from `org_tree`, not as one `people` list.
const TEAM = "team";

const plural = (count, word, many = `${word}s`) => `${count.toLocaleString()} ${count === 1 ? word : many}`;
const matchesTerm = (term) => (person) => `${personName(person)} ${personTitle(person)} ${person.email ?? ""}`.toLowerCase().includes(term);

/** One card per team the user leads or is in: its name, lead, the user's part in it and its members. */
function TeamGroups({ me, term, onOpenPerson }) {
  const tree = useOrgTree();
  const selfId = personId(me?.employee);
  const teams = useMemo(() => teamsOfMe(me, tree.data), [me, tree.data]);
  const visible = term
    ? teams
        .map((team) => (team.name.toLowerCase().includes(term) ? team : { ...team, members: team.members.filter(matchesTerm(term)) }))
        .filter((team) => team.members.length || team.name.toLowerCase().includes(term) || (team.lead && matchesTerm(term)(team.lead)))
    : teams;
  const you = (person) => Boolean(selfId && personId(person) === selfId);

  return (
    <QueryState query={tree} rows={5}>
      {visible.length ? (
        <>
          <p className="text-xs text-muted-foreground" aria-live="polite">{plural(visible.length, "team")}</p>
          <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3" data-tour="team-people">
            {visible.map((team) => (
              <li key={team.id} className={cn(candidateStyles.card, "flex flex-col gap-2 p-3")}>
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-2 pt-1">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-foreground">{team.name}</h3>
                    {team.department && <p className="truncate text-xs text-muted-foreground">{team.department}</p>}
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    {team.role === "lead" ? "You lead this team" : "You're a member"}
                  </span>
                </div>
                <dl className="flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    <dt>Team lead:</dt>
                    <dd className="font-semibold text-foreground">{team.lead ? `${personName(team.lead)}${you(team.lead) ? " (you)" : ""}` : "Not set"}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Size:</dt>
                    <dd className="tabular-nums font-semibold text-foreground">{plural(team.size, "person", "people")}</dd>
                  </div>
                </dl>
                <ul className="space-y-1 border-t border-border pt-2">
                  {team.lead && (
                    <li><PersonButton person={team.lead} onOpen={onOpenPerson} note={you(team.lead) ? "Team lead · You" : "Team lead"} /></li>
                  )}
                  {team.members.map((person) => (
                    <li key={person.id}><PersonButton person={person} onOpen={onOpenPerson} note={you(person) ? "You" : undefined} /></li>
                  ))}
                  {!team.lead && !team.members.length && <li className="px-2 py-2 text-sm text-muted-foreground">No one in this team yet.</li>}
                </ul>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState icon={Users} title={term ? "Nobody matches that search" : "You're not in a team yet"}>
          {term ? "Try a different name." : "Once HR adds you to a team, or makes you its lead, it appears here."}
        </EmptyState>
      )}
    </QueryState>
  );
}

function People({ scopes, me, directReports, onOpenPerson }) {
  const [wanted, setWanted] = useState(null);
  const [search, setSearch] = useState("");
  const scope = pick(wanted, scopes);
  const direct = scope === DIRECT;
  const grouped = scope === TEAM;
  const peopleQuery = usePeople(scope, { enabled: Boolean(scope) && !direct && !grouped });
  const query = direct ? { isPending: false, isError: false, data: directReports } : peopleQuery;
  const people = useMemo(() => recordsOf(query.data, ["people", "records", "data"]), [query.data]);
  const term = search.trim().toLowerCase();
  const visible = term ? people.filter(matchesTerm(term)) : people;

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

      {grouped ? (
        <TeamGroups me={me} term={term} onOpenPerson={onOpenPerson} />
      ) : (
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
      )}
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
  // "Own" is only yourself, which isn't a team.
  const peopleScopes = useMemo(() => {
    const options = scopeOptions(capabilities, "employees").filter((option) => option.id !== "own");
    const at = options.findIndex((option) => option.id === "reports");
    return at < 0 ? options : [...options.slice(0, at), { id: DIRECT, label: "Direct reports" }, ...options.slice(at)];
  }, [capabilities]);
  // "Own" alone is just your own balance, which /my-leaves already shows.
  const balanceScopes = useMemo(() => scopeOptions(capabilities, "leaves").filter((option) => option.id !== "own"), [capabilities]);
  const tabs = [
    ["people", "People"],
    ...(balanceScopes.length ? [["balances", "Leave balances"]] : []),
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
        description="Your teams, who leads each one, and the people in them. Open someone to see their career timeline and leave balance."
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
        ) : tab === "codes" ? (
          <LeaveCodesPanel />
        ) : (
          <People scopes={peopleScopes} me={access.me.data} directReports={directReports} onOpenPerson={setPerson} />
        )}
      </section>

      <TeamMemberDrawer person={person} onClose={() => setPerson(null)} />
    </main>
  );
}
