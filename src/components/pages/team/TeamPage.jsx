import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHrAccess } from "../../../hooks/useHrAccess";
import { scopeOptions } from "../../../utils/hrAccess";
import { personId, personName, personTitle } from "../../../utils/hrOrg";
import { recordsOf } from "../../../utils/hrRecords";
import { CandidatePageHeader } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { EmptyState, PersonButton, QueryState } from "../org/orgUi";
import LeaveCodesPanel from "./LeaveCodesPanel";
import TeamLeavesPanel from "./TeamLeavesPanel";
import TeamMemberDrawer from "./TeamMemberDrawer";
import { DayStatus, DaySummary } from "./TeamDay";
import useMyTeams, { inTeam } from "./useMyTeams";
import useTeamDay from "./useTeamDay";

const plural = (count, word, many = `${word}s`) => `${count.toLocaleString()} ${count === 1 ? word : many}`;
const matchesTerm = (term) => (person) => `${personName(person)} ${personTitle(person)} ${person.email ?? ""}`.toLowerCase().includes(term);

const BADGES = { lead: "You lead this team", member: "You're a member", under: "Under you", unplaced: "Reports to you" };

/**
 * One card per real team: the ones the user leads or is in, then, for managers, every team that
 * someone under them leads or is in, and last the people under them who aren't in any team.
 */
function TeamGroups({ me, directReports, hasReports, canOpenReports, term, onOpenPerson }) {
  const { teams, selfId, query: loading } = useMyTeams({ me, directReports, hasReports });
  const visible = term
    ? teams
        .map((team) => (team.name.toLowerCase().includes(term) ? team : { ...team, members: team.members.filter(matchesTerm(term)) }))
        .filter((team) => team.members.length || team.name.toLowerCase().includes(term) || (team.lead && matchesTerm(term)(team.lead)))
    : teams;
  const you = (person) => Boolean(selfId && personId(person) === selfId);
  const statusOf = useTeamDay();
  const status = (person) => <DayStatus status={statusOf?.(person)} />;

  return (
    <QueryState query={loading} rows={5}>
      {visible.length ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <p aria-live="polite">{plural(visible.length, "team")}</p>
            {statusOf && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-foreground">Today:</span>
                <DaySummary people={visible.flatMap(inTeam).filter((person) => !you(person))} statusOf={statusOf} className="flex flex-wrap gap-x-3 gap-y-1" />
              </div>
            )}
          </div>
          <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3" data-tour="team-people">
            {visible.map((team) => {
              const unplaced = team.role === "unplaced";
              const subtitle = unplaced ? "People under you who aren't in a team yet" : team.department;
              return (
                <li key={team.id} className={cn(candidateStyles.card, "flex flex-col gap-2 p-3")}>
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-2 pt-1">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-foreground">{team.name}</h3>
                      {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      {BADGES[team.role]}
                    </span>
                  </div>
                  <dl className="flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground">
                    {!unplaced && (
                      <>
                        <div className="flex gap-1">
                          <dt>Manager:</dt>
                          <dd className="font-semibold text-foreground">{team.manager ? `${personName(team.manager)}${you(team.manager) ? " (you)" : ""}` : "Not set"}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt>Team lead:</dt>
                          <dd className="font-semibold text-foreground">{team.lead ? `${personName(team.lead)}${you(team.lead) ? " (you)" : ""}` : "Not set"}</dd>
                        </div>
                      </>
                    )}
                    <div className="flex gap-1">
                      <dt>Members:</dt>
                      <dd className="tabular-nums font-semibold text-foreground">{team.size.toLocaleString()}</dd>
                    </div>
                  </dl>
                  <DaySummary people={inTeam(team)} statusOf={statusOf} className="flex flex-wrap gap-x-3 gap-y-1 px-2 text-xs text-muted-foreground" />
                  <ul className="space-y-1 border-t border-border pt-2">
                    {team.lead && (
                      <li><PersonButton person={team.lead} onOpen={onOpenPerson} note={you(team.lead) ? "Team lead · You" : "Team lead"} aside={status(team.lead)} /></li>
                    )}
                    {team.members.map((person) => (
                      <li key={personId(person)}><PersonButton person={person} onOpen={onOpenPerson} note={you(person) ? "You" : unplaced && person.managerName ? `Reports to ${person.managerName}` : undefined} aside={status(person)} /></li>
                    ))}
                    {!team.lead && !team.members.length && <li className="px-2 py-2 text-sm text-muted-foreground">No one in this team yet.</li>}
                  </ul>
                </li>
              );
            })}
          </ul>
          {!canOpenReports && visible.some((team) => team.role === "under" || team.role === "unplaced") && (
            <p className="text-xs text-muted-foreground">
              Your access role only covers your own team, so some profiles under you may not open. HR can change your role&apos;s Employees access to &quot;My reportees&quot;.
            </p>
          )}
        </>
      ) : (
        <EmptyState icon={Users} title={term ? "Nobody matches that search" : "You're not in a team yet"}>
          {term ? "Try a different name." : "Once HR adds you to a team, or makes you its lead, it appears here."}
        </EmptyState>
      )}
    </QueryState>
  );
}

// Everyone sees their people team by team, from `org_tree`; there is no scope switcher.
function People({ canSeeOthers, me, directReports, hasReports, canOpenReports, onOpenPerson }) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();

  if (!canSeeOthers) {
    return (
      <EmptyState icon={Users} title="Your role has no access to other people's records">
        Ask HR or your admin to give your access role "My team" or wider on Employees.
      </EmptyState>
    );
  }

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
      <TeamGroups me={me} directReports={directReports} hasReports={hasReports} canOpenReports={canOpenReports} term={term} onOpenPerson={onOpenPerson} />
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
  const hasReports = recordsOf(directReports, ["people", "records", "data"]).length > 0;
  // "Own" is only yourself, which isn't a team.
  const peopleScopes = useMemo(() => scopeOptions(capabilities, "employees").filter((option) => option.id !== "own"), [capabilities]);
  // Profiles of people under a manager open only when the role reads their reportees.
  const canOpenReports = peopleScopes.some((option) => option.id === "reports");
  // "Own" alone is just your own balance, which /my-leaves already shows.
  const balanceScopes = useMemo(() => scopeOptions(capabilities, "leaves").filter((option) => option.id !== "own"), [capabilities]);
  const tabs = [
    ["people", "People"],
    ...(balanceScopes.length ? [["leaves", "Leaves"]] : []),
    // Anyone with people below them gives the one-time codes needed to apply for leave; everyone sees their own.
    ["codes", "Leave codes"],
  ];
  // ?tab=balances (the "Team balances" link on leave approvals) opens the leaves tab on the balances.
  const wanted = params.get("tab") === "balances" ? "leaves" : params.get("tab");
  const tab = tabs.some(([id]) => id === wanted) ? wanted : "people";
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
        {tab === "leaves" ? (
          <TeamLeavesPanel me={access.me.data} directReports={directReports} hasReports={hasReports} balanceScopes={balanceScopes} startOnBalances={params.get("tab") === "balances"} onOpenPerson={setPerson} />
        ) : tab === "codes" ? (
          <LeaveCodesPanel />
        ) : (
          <People canSeeOthers={peopleScopes.length > 0} me={access.me.data} directReports={directReports} hasReports={hasReports} canOpenReports={canOpenReports} onOpenPerson={setPerson} />
        )}
      </section>

      <TeamMemberDrawer person={person} onClose={() => setPerson(null)} />
    </main>
  );
}
