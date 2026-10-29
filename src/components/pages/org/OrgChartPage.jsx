import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRightLeft, Building2, ChevronDown, ChevronRight, Layers, Network, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrgTree } from "../../../queries/hr.queries";
import { allNodeIds, buildOrgTree, filterOrgTree, personName } from "../../../utils/hrOrg";
import { CandidatePageHeader } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { EmptyState, PersonButton, ConsoleLink, PersonDrawer, QueryState, Segmented, primaryButton } from "./orgUi";
import MoveEmployeeDialog from "./MoveEmployeeDialog";
import OrgStructureBoard from "./OrgStructureBoard";

const KIND = {
  branch: { icon: Building2, label: "Branch", leadLabel: null },
  department: { icon: Layers, label: "Department", leadLabel: "Head" },
  team: { icon: Users, label: "Team", leadLabel: "Lead" },
  group: { icon: Network, label: "Other", leadLabel: null },
};

const TOTAL_LABELS = [["branches", "Branches"], ["departments", "Departments"], ["teams", "Teams"], ["employees", "People"]];

function OrgNode({ node, depth, expanded, toggle, onOpenPerson }) {
  const kind = KIND[node.kind] || KIND.group;
  const open = expanded.has(node.id);
  const count = node.memberCount ?? node.people.length + node.children.length;
  const Icon = kind.icon;
  return (
    <li className={cn(depth > 0 && "border-l border-border pl-3 sm:pl-5")}>
      <div className={cn(candidateStyles.card, "p-2")}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => toggle(node.id)}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
        >
          {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          <span className={candidateStyles.tile}><Icon size={18} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{node.name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {[kind.label, node.lead && kind.leadLabel ? `${kind.leadLabel}: ${personName(node.lead)}` : null].filter(Boolean).join(" · ")}
            </span>
          </span>
          {count > 0 && <span className="text-xs tabular-nums text-muted-foreground">{count}</span>}
        </button>
        {open && (node.lead || node.people.length > 0) && (
          <ul className="mt-1 grid gap-1 border-t border-border pt-2 sm:grid-cols-2 xl:grid-cols-3">
            {node.lead && kind.leadLabel && (
              <li><PersonButton person={node.lead} onOpen={onOpenPerson} note={kind.leadLabel} /></li>
            )}
            {node.people.map((person, index) => (
              <li key={person.id ?? index}><PersonButton person={person} onOpen={onOpenPerson} /></li>
            ))}
          </ul>
        )}
      </div>
      {open && node.children.length > 0 && (
        <ul className="mt-2 space-y-2">
          {node.children.map((child) => (
            <OrgNode key={child.id} node={child} depth={depth + 1} expanded={expanded} toggle={toggle} onOpenPerson={onOpenPerson} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function OrgChartPage() {
  const query = useOrgTree();
  const { nodes, totals } = useMemo(() => buildOrgTree(query.data), [query.data]);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState(null);
  const [person, setPerson] = useState(null);
  const [moving, setMoving] = useState(null);
  const [params, setParams] = useSearchParams();
  const arranging = params.get("mode") === "arrange";
  const setMode = (mode) => setParams(mode === "arrange" ? { mode } : {}, { replace: true });

  const visible = useMemo(() => filterOrgTree(nodes, search), [nodes, search]);
  // Branches start open; a search opens everything it matched.
  const expanded = useMemo(
    () => (search.trim() ? new Set(allNodeIds(visible)) : expandedIds ?? new Set(nodes.map((node) => node.id))),
    [search, visible, expandedIds, nodes],
  );
  const toggle = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
    setSearch("");
  };
  const allOpen = expanded.size >= allNodeIds(nodes).length;
  const stats = TOTAL_LABELS.filter(([key]) => totals[key] !== undefined);

  return (
    <main className={candidateStyles.page}>
      <CandidatePageHeader
        icon={Network}
        eyebrow="Organisation"
        title="Org chart"
        description={arranging
          ? "Drag people between teams and departments, move teams, pick leads and heads, and create or rename teams and departments."
          : "Branches, departments and teams, with who leads each one. Select a person to see their profile or change where they sit."}
      >
        <span data-tour="org-arrange">
          <Segmented label="Org chart mode" options={[["view", "View"], ["arrange", "Arrange"]]} value={arranging ? "arrange" : "view"} onChange={setMode} />
        </span>
        {!arranging && (
          <button type="button" onClick={() => setExpandedIds(new Set(allOpen ? [] : allNodeIds(nodes)))} className={candidateStyles.ghost}>
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </CandidatePageHeader>

      {stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(([key, label]) => (
            <div key={key} className={cn(candidateStyles.card, "px-4 py-3")}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums text-foreground">{totals[key]}</dd>
            </div>
          ))}
        </dl>
      )}

      {arranging ? (
        <>
          <OrgStructureBoard />
          <p className="text-xs text-muted-foreground">
            Branches, and anything this board can't change, are edited in the HR console. <ConsoleLink tab="Organisation" className="ml-1 min-h-9">Open HR console</ConsoleLink>
          </p>
        </>
      ) : (
        <>
          <label className="relative block max-w-md">
            <span className="sr-only">Search people, teams and departments</span>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people, teams and departments"
              className="min-h-11 w-full rounded-lg border border-border bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </label>

          <QueryState query={query}>
            {visible.length ? (
              <ul className="space-y-2" aria-label="Organisation structure">
                {visible.map((node) => (
                  <OrgNode key={node.id} node={node} depth={0} expanded={expanded} toggle={toggle} onOpenPerson={setPerson} />
                ))}
              </ul>
            ) : (
              <EmptyState icon={Network} title={search ? "Nothing matches that search" : "No organisation structure yet"}>
                {search ? "Try a person's name, a team or a department." : "Once HR adds branches, departments and teams, they appear here."}
              </EmptyState>
            )}
          </QueryState>
        </>
      )}

      <PersonDrawer
        person={person}
        onClose={() => setPerson(null)}
        actions={
          <button type="button" onClick={() => { setMoving(person); setPerson(null); }} className={primaryButton} data-tour="org-move-person">
            <ArrowRightLeft size={16} aria-hidden="true" /> Change place
          </button>
        }
      />
      {moving && <MoveEmployeeDialog person={moving} onClose={() => setMoving(null)} />}
    </main>
  );
}
