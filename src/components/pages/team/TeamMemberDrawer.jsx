import { createElement, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Skeleton from "react-loading-skeleton";
import { BriefcaseBusiness, CalendarDays, Mail, Phone, TrendingUp, UserRound, Users, X } from "lucide-react";
import { useEmployee } from "../../../queries/hr.queries";
import { useHrAccess } from "../../../hooks/useHrAccess";
import { formatTenure, personName, personTitle } from "../../../utils/hrOrg";
import { formatDate } from "../../../utils/hrRecords";
import LeaveBalanceCard from "../../employement/components/leave/LeaveBalanceCard";
import CareerTimeline from "../profile/CareerTimeline";
import MySalary from "../profile/MySalary";
import PromoteDialog from "./PromoteDialog";
import { candidateStyles } from "../candidate/candidateStyles";
import { PersonAvatar, RoleBadge, Segmented } from "../org/orgUi";

const names = (items) => (Array.isArray(items) ? items.map((item) => item?.name).filter(Boolean).join(", ") : "");

/** One team member: who they are, their career timeline, leave balance and (with salary access) pay. */
export default function TeamMemberDrawer({ person, onClose }) {
  const id = person?.id ?? person?.employee_id;
  const detail = useEmployee(id);
  const access = useHrAccess();
  const [section, setSection] = useState("career");
  const [promoting, setPromoting] = useState(false);
  const record = { ...person, ...(detail.data?.employee ?? {}) };
  const tenure = formatTenure(detail.data?.tenure);
  const manager = record.manager;
  const showLeave = access.canAtLeast("leaves", "read", "team");
  // The backend still checks that this person is inside the update scope.
  const canEditTimeline = access.canAtLeast("employees", "update", "team");
  const showSalary = access.canAtLeast("salary", "read", "team");
  const canReviseSalary = access.canAtLeast("salary", "update", "team");
  const canPromote = canEditTimeline;
  const sections = [["career", "Career"], ...(showLeave ? [["leave", "Leave"]] : []), ...(showSalary ? [["salary", "Salary"]] : [])];
  const facts = [
    [Mail, "Email", record.email1 || record.email],
    [Phone, "Phone", record.phone_mobile],
    [Users, "Team", names(record.teams)],
    [BriefcaseBusiness, "Department", names(record.departments)],
    [UserRound, "Reports to", manager ? personName(manager) : ""],
    [CalendarDays, "Joined", record.joining_date ? `${formatDate(record.joining_date)}${tenure ? ` · ${tenure}` : ""}` : tenure],
  ].filter(([, , value]) => value);

  const close = () => {
    setSection("career");
    setPromoting(false);
    onClose();
  };

  return (
    <Dialog.Root open={Boolean(person)} onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-1000 bg-foreground/30 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-1000 flex w-full max-w-2xl flex-col overflow-y-auto bg-background p-5 shadow-xl outline-none sm:rounded-l-2xl sm:p-6">
          {person && (
            <>
              <div className="flex items-start gap-3">
                <PersonAvatar person={record} className="size-14 text-base" />
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="truncate text-lg font-semibold text-foreground">{personName(record)}</Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground">{personTitle(record) || "Employee"}</Dialog.Description>
                  <RoleBadge category={record.access_role?.role_category} className="mt-2" />
                </div>
                {canPromote && detail.isSuccess && (
                  <button type="button" onClick={() => setPromoting(true)} className={candidateStyles.ghost} data-tour="team-promote">
                    <TrendingUp size={15} aria-hidden="true" /> Promote
                  </button>
                )}
                <Dialog.Close aria-label="Close" className={candidateStyles.iconButton}>
                  <X size={18} aria-hidden="true" />
                </Dialog.Close>
              </div>

              {detail.isPending && detail.fetchStatus !== "idle" ? (
                <Skeleton className="mt-5" count={3} height={36} borderRadius={10} />
              ) : detail.isError ? (
                <p role="alert" className="mt-5 rounded-xl border border-border bg-muted px-3 py-2.5 text-sm leading-6 text-muted-foreground">
                  {detail.error?.code === 403 ? "This person is outside your team access, so their profile can't be shown." : detail.error?.message}
                </p>
              ) : (
                <>
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    {facts.map(([icon, label, value]) => (
                      <div key={label} className="flex min-w-0 items-start gap-3">
                        {createElement(icon, { size: 16, className: "mt-0.5 shrink-0 text-muted-foreground", "aria-hidden": true })}
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">{label}</dt>
                          <dd className="wrap-break-word text-sm font-medium text-foreground">{value}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-6 border-t border-border pt-5">
                    {sections.length > 1 && (
                      <div className="mb-4">
                        <Segmented label="Show" options={sections} value={section} onChange={setSection} />
                      </div>
                    )}
                    {section === "leave" && showLeave ? (
                      <LeaveBalanceCard employeeId={id} title="Leave balance" className="" />
                    ) : section === "salary" && showSalary ? (
                      <MySalary employeeId={id} name={personName(record)} canRevise={canReviseSalary} />
                    ) : (
                      <CareerTimeline employeeId={id} canEdit={canEditTimeline} />
                    )}
                  </div>
                </>
              )}
            </>
          )}
          {promoting && <PromoteDialog open onClose={() => setPromoting(false)} person={record} canReviseSalary={canReviseSalary} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
