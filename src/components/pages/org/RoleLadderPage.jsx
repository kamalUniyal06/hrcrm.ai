import { useMemo } from "react";
import { ListTree, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMe, useRoles } from "../../../queries/hr.queries";
import { buildRoleTree, placeFromMe, roleCategory } from "../../../utils/hrOrg";
import { recordsOf } from "../../../utils/hrRecords";
import { CandidatePageHeader } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { EmptyState, QueryState, RoleBadge } from "./orgUi";

function RoleNode({ role, viewerRoleId }) {
  const isViewer = role.id === viewerRoleId;
  return (
    <li>
      <div
        className={cn(candidateStyles.card, "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3", isViewer && "border-primary/40 bg-primary/5")}
        aria-current={isViewer ? "true" : undefined}
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
            {role.name}
            {isViewer && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Your role</span>}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="tabular-nums">{role.accessMembers}</span> with this access · <span className="tabular-nums">{role.jobMembers}</span> in this job role
          </p>
        </div>
        <RoleBadge category={roleCategory(role.category)} />
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">Level {role.level}</span>
      </div>
      {role.children.length > 0 && (
        <ul className="mt-2 ml-4 space-y-2 border-l border-border pl-3 sm:ml-6 sm:pl-5">
          {role.children.map((child) => <RoleNode key={child.id} role={child} viewerRoleId={viewerRoleId} />)}
        </ul>
      )}
    </li>
  );
}

export default function RoleLadderPage() {
  const query = useRoles();
  const me = useMe();
  const viewerRoleId = placeFromMe(me.data).accessRole.id;
  const { roots, unlinked } = useMemo(() => buildRoleTree(recordsOf(query.data, ["roles", "records", "data"])), [query.data]);

  return (
    <main className={candidateStyles.page}>
      <CandidatePageHeader
        icon={ListTree}
        eyebrow="Organisation"
        title="Role ladder"
        description="Every access role from most to least senior. A higher level is more senior; moving to a higher level counts as a promotion."
      />
      <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
        The ladder is for reference. What each person can open is set by their role's access, area by area.
      </p>
      <QueryState query={query}>
        {roots.length || unlinked.length ? (
          <div className="space-y-6">
            {roots.length > 0 && (
              <ul className="space-y-2" aria-label="Role ladder">
                {roots.map((role) => <RoleNode key={role.id} role={role} viewerRoleId={viewerRoleId} />)}
              </ul>
            )}
            {unlinked.length > 0 && (
              <section aria-labelledby="unlinked-roles">
                <h2 id="unlinked-roles" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Unlink size={15} aria-hidden="true" /> Unlinked
                </h2>
                <p className="mt-1 mb-3 text-xs text-muted-foreground">These roles have no valid parent role, so they can't be placed on the ladder.</p>
                <ul className="space-y-2">
                  {unlinked.map((role) => <RoleNode key={role.id} role={role} viewerRoleId={viewerRoleId} />)}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <EmptyState icon={ListTree} title="No roles yet">Roles appear here once HR sets them up.</EmptyState>
        )}
      </QueryState>
    </main>
  );
}
