import { createElement } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Skeleton from "react-loading-skeleton";
import { BriefcaseBusiness, Building2, Mail, RotateCw, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmployee } from "../../../queries/hr.queries";
import { initials, personName, personTitle, roleCategory } from "../../../utils/hrOrg";
import { candidateStyles } from "../candidate/candidateStyles";

export function PersonAvatar({ person, className }) {
  const name = personName(person);
  const photo = person?.profile_image || person?.photo_url || person?.image;
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-primary", className)} aria-hidden="true">
      {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </span>
  );
}

/** Role category: a coloured dot plus its name, so the colour is never the only signal. */
export function RoleBadge({ category, className }) {
  const meta = typeof category === "string" ? roleCategory(category) : category;
  if (!meta) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground", className)}>
      <span className={cn("size-2 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/** Loading skeleton, readable error with retry, or the content. */
export function QueryState({ query, rows = 4, children }) {
  if (query.isPending) {
    return (
      <div role="status" aria-label="Loading" className="space-y-3">
        <Skeleton count={rows} height={44} borderRadius={12} />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div role="alert" className={cn(candidateStyles.card, "flex flex-col items-center gap-3 px-6 py-12 text-center")}>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">{query.error?.message || "This couldn't be loaded."}</p>
        <button type="button" onClick={() => query.refetch()} className={candidateStyles.ghost}>
          <RotateCw size={15} aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }
  return children;
}

export function EmptyState({ icon = Users, title, children }) {
  const Icon = icon;
  return (
    <div className={cn(candidateStyles.card, "flex flex-col items-center gap-2 px-6 py-12 text-center")}>
      <span className={candidateStyles.tile}><Icon size={20} aria-hidden="true" /></span>
      <p className="mt-1 text-sm font-semibold text-foreground">{title}</p>
      {children && <p className="max-w-md text-sm leading-6 text-muted-foreground">{children}</p>}
    </div>
  );
}

/** A person's name and title as a button that opens their profile drawer. */
export function PersonButton({ person, onOpen, note }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(person)}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
    >
      <PersonAvatar person={person} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{personName(person)}</span>
        {(personTitle(person) || note) && (
          <span className="block truncate text-xs text-muted-foreground">{[note, personTitle(person)].filter(Boolean).join(" · ")}</span>
        )}
      </span>
    </button>
  );
}

/** A row of toggle buttons; `options` are [key, label] pairs. */
export function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap rounded-lg bg-muted p-1">
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "min-h-9 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none",
            value === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** A centred dialog with a title, a description and a close button. `wide` fits a table. */
export function ActionDialog({ title, description, open, onClose, wide = false, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-1000 bg-foreground/30 backdrop-blur-[2px]" />
        <Dialog.Content className={cn("fixed top-1/2 left-1/2 z-1000 max-h-[90dvh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-background p-5 shadow-xl outline-none sm:p-6", wide ? "w-[min(64rem,calc(100vw-2rem))]" : "w-[min(36rem,calc(100vw-2rem))]")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className={candidateStyles.iconButton}><X size={18} aria-hidden="true" /></Dialog.Close>
          </div>
          <div className="mt-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const fieldClass = "mt-1.5 min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
export const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";

const fieldName = (value) => (value && typeof value === "object" ? value.name : value);
// `employee` lists teams, departments and job roles as arrays of { id, name }.
const namesOf = (value) => (Array.isArray(value) ? value.map(fieldName).filter(Boolean).join(", ") : "");

/**
 * Profile drawer for a person picked in the org views. It shows what the tree already
 * knows and adds the `employee` record when the viewer's access allows it.
 */
export function PersonDrawer({ person, onClose, actions }) {
  const id = person?.id ?? person?.employee_id;
  const detail = useEmployee(id);
  const record = { ...person, ...(detail.data?.employee ?? detail.data ?? {}) };
  const facts = [
    [BriefcaseBusiness, "Job role", namesOf(record.job_roles) || fieldName(record.job_role) || record.job_role_name],
    [Users, "Team", namesOf(record.teams) || fieldName(record.team) || record.team_name],
    [Building2, "Department", namesOf(record.departments) || fieldName(record.department) || record.department_name],
    [Mail, "Email", record.email || record.email1],
  ].filter(([, , value]) => value);

  return (
    <Dialog.Root open={Boolean(person)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-1000 bg-foreground/30 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-1000 flex w-full max-w-md flex-col overflow-y-auto bg-background p-5 shadow-xl outline-none sm:rounded-l-2xl">
          {person && (
            <>
              <div className="flex items-start gap-3">
                <PersonAvatar person={record} className="size-14 text-base" />
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="truncate text-lg font-semibold text-foreground">{personName(record)}</Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground">{personTitle(record) || "Employee"}</Dialog.Description>
                  <RoleBadge category={record.role_category ?? record.access_role?.role_category} className="mt-2" />
                </div>
                <Dialog.Close aria-label="Close profile" className={candidateStyles.iconButton}>
                  <X size={18} aria-hidden="true" />
                </Dialog.Close>
              </div>
              <dl className="mt-6 space-y-3">
                {facts.map(([icon, label, value]) => (
                  <div key={label} className="flex items-start gap-3">
                    {createElement(icon, { size: 16, className: "mt-0.5 shrink-0 text-muted-foreground", "aria-hidden": true })}
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="wrap-break-word text-sm font-medium text-foreground">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              {actions && detail.isSuccess && <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">{actions}</div>}
              {detail.isPending && detail.fetchStatus !== "idle" && <Skeleton className="mt-4" count={2} height={36} borderRadius={10} />}
              {detail.isError && (
                <p className="mt-6 rounded-xl border border-border bg-muted px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                  {detail.error?.code === 403
                    ? "Their full profile is outside your access. You can see where they sit in the organisation."
                    : detail.error?.message}
                </p>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
