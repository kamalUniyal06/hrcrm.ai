import { useMemo, useState } from "react";
import { ArrowRightLeft, ChevronDown, ChevronRight, GitFork } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMe, useReportingTree } from "../../../queries/hr.queries";
import { buildReportingTree, countReports, pathToPerson, personId, personName, personTitle } from "../../../utils/hrOrg";
import { CandidatePageHeader } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { EmptyState, PersonAvatar, PersonDrawer, QueryState, primaryButton } from "./orgUi";
import MoveEmployeeDialog from "./MoveEmployeeDialog";

function ReportNode({ node, expanded, toggle, viewerId, onOpenPerson }) {
  const open = expanded.has(node.id);
  const total = countReports(node);
  const isViewer = node.id === viewerId;
  return (
    <li>
      <div className={cn(candidateStyles.card, "flex items-center gap-1 p-1.5", isViewer && "border-primary/40 bg-primary/5")}>
        {node.reports.length > 0 ? (
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Show"} ${personName(node)}'s reports`}
            onClick={() => toggle(node.id)}
            className={candidateStyles.iconButton}
          >
            {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          </button>
        ) : (
          <span className="size-11 shrink-0" aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={() => onOpenPerson(node)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
        >
          <PersonAvatar person={node} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {personName(node)}
              {isViewer && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">You</span>}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{personTitle(node) || "Employee"}</span>
          </span>
          {total > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              <span className="tabular-nums">{node.reports.length}</span> direct · <span className="tabular-nums">{total}</span> total
            </span>
          )}
        </button>
      </div>
      {open && node.reports.length > 0 && (
        <ul className="mt-2 ml-5 space-y-2 border-l border-border pl-3 sm:ml-6 sm:pl-5">
          {node.reports.map((child) => (
            <ReportNode key={child.id} node={child} expanded={expanded} toggle={toggle} viewerId={viewerId} onOpenPerson={onOpenPerson} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function ReportingLinesPage() {
  const query = useReportingTree();
  const me = useMe();
  const viewerId = personId(me.data?.employee);
  const tree = useMemo(() => buildReportingTree(query.data), [query.data]);
  const [expandedIds, setExpandedIds] = useState(null);
  const [person, setPerson] = useState(null);
  const [moving, setMoving] = useState(null);

  // The viewer's own line opens by default, down to them.
  const expanded = useMemo(() => {
    if (expandedIds) return expandedIds;
    const path = pathToPerson(tree, viewerId);
    return new Set(path.length ? path : tree.map((node) => node.id));
  }, [expandedIds, tree, viewerId]);

  const toggle = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  return (
    <main className={candidateStyles.page}>
      <CandidatePageHeader
        icon={GitFork}
        eyebrow="Organisation"
        title="Reporting lines"
        description="Who reports to whom. When someone has no reporting person set, their team lead or department head is their manager. Select a person to change who they report to."
      />
      <QueryState query={query}>
        {tree.length ? (
          <ul className="space-y-2" aria-label="Reporting lines">
            {tree.map((node) => (
              <ReportNode key={node.id} node={node} expanded={expanded} toggle={toggle} viewerId={viewerId} onOpenPerson={setPerson} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={GitFork} title="No reporting lines yet">
            Reporting lines appear once managers are set on employee records.
          </EmptyState>
        )}
      </QueryState>
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
