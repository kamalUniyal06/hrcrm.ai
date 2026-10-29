import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Skeleton from "react-loading-skeleton";
import { IdCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMe } from "../../../queries/hr.queries";
import { personName, personTitle, placeFromMe } from "../../../utils/hrOrg";
import { selectIsAdmin } from "../../../utils/pageAccess";
import { candidateStyles } from "../candidate/candidateStyles";

/** "Employee details": employment type, team, department, branch, job role, manager and joining date, from `me`. */
export default function MyPlaceCard({ className }) {
  const me = useMe();
  // The org pages are admin-only, so only admins get links to them.
  const isAdmin = useSelector(selectIsAdmin);
  if (me.isError) return null;
  const place = placeFromMe(me.data);
  const managerTitle = personTitle(place.manager);
  const facts = [
    ["Employment type", place.employmentType],
    ["Team", place.team],
    ["Department", place.department],
    ["Branch", place.branch],
    ["Job role", place.jobRole || place.designation],
    ["Manager", place.manager ? `${personName(place.manager)}${managerTitle ? ` · ${managerTitle}` : ""}` : "Not set yet"],
    ["Joined", place.joinedOn],
    ["With us for", place.tenure],
  ].filter(([, value]) => value);

  return (
    <section aria-labelledby="my-place-title" data-tour="my-place" className={cn(candidateStyles.card, "p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <h2 id="my-place-title" className="flex items-center gap-2 text-[15px] font-semibold">
          <IdCard size={16} className="text-primary" aria-hidden="true" /> Employee details
        </h2>
        {isAdmin && <Link to="/org/chart" className="shrink-0 text-xs font-semibold text-primary hover:underline">Org chart</Link>}
      </div>

      {me.isPending ? (
        <Skeleton className="mt-4" count={6} height={18} />
      ) : (
        <>
          <dl className="mt-4 space-y-3">
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm font-medium wrap-break-word text-foreground">{value}</dd>
              </div>
            ))}
          </dl>

          {isAdmin && place.directReportsCount > 0 && (
            <Link to="/org/reporting" className="mt-3 inline-block text-xs font-semibold text-primary hover:underline">See reporting lines</Link>
          )}
        </>
      )}
    </section>
  );
}
