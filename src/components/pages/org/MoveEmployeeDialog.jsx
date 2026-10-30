import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import Skeleton from "react-loading-skeleton";
import { useAssignEmployee, useEmployee, useLookups } from "../../../queries/hr.queries";
import { structureError } from "../../../utils/hrAccess";
import { assignChanges, personName, placementOf } from "../../../utils/hrOrg";
import { candidateStyles } from "../candidate/candidateStyles";
import { ActionDialog, fieldClass, primaryButton } from "./orgUi";

const byName = (a, b) => String(a.name).localeCompare(String(b.name));

function MoveForm({ employee, onClose }) {
  const lookups = useLookups();
  const assign = useAssignEmployee();
  const [form, setForm] = useState(() => placementOf(employee));
  const [problem, setProblem] = useState(null);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const id = String(employee.id);
  const managers = useMemo(() => (lookups.data?.employees ?? []).filter((person) => person.id && person.id !== id), [lookups.data, id]);
  const teams = useMemo(() => [...(lookups.data?.teams ?? [])].sort(byName), [lookups.data]);
  const departments = useMemo(() => [...(lookups.data?.departments ?? [])].sort(byName), [lookups.data]);
  const jobRoles = useMemo(() => [...(lookups.data?.roles ?? [])].sort(byName), [lookups.data]);
  const changes = assignChanges(employee, form);
  const changed = Object.keys(changes).length > 0;
  const memberTeams = (employee.teams ?? []).filter((team) => team.membership !== "lead");
  const leads = (employee.teams ?? []).filter((team) => team.membership === "lead").map((team) => team.name);
  const heads = (employee.departments ?? []).filter((department) => department.membership === "head").map((department) => department.name);

  const submit = (event) => {
    event.preventDefault();
    setProblem(null);
    assign.mutate(
      { employeeId: id, changes },
      {
        onSuccess: () => {
          toast.success(`${personName(employee)} moved`);
          onClose();
        },
        onError: (error) =>
          setProblem({
            title: "Nothing was changed",
            detail: error.code === 403 ? `${structureError(error)} Ask whoever manages roles to add it.` : error.message,
          }),
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="move-manager" className="text-sm font-semibold text-foreground">Reports to</label>
          <select id="move-manager" value={form.managerId} onChange={set("managerId")} disabled={lookups.isPending} className={fieldClass}>
            <option value="">No manager</option>
            {managers.map((person) => <option key={person.id} value={person.id}>{personName(person)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="move-designation" className="text-sm font-semibold text-foreground">Designation</label>
          <input id="move-designation" maxLength={100} value={form.designation} onChange={set("designation")} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="move-team" className="text-sm font-semibold text-foreground">Team</label>
          <select id="move-team" value={form.teamId} onChange={set("teamId")} disabled={lookups.isPending} className={fieldClass}>
            <option value="">Not in a team</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="move-department" className="text-sm font-semibold text-foreground">Department</label>
          <select id="move-department" value={form.departmentId} onChange={set("departmentId")} disabled={lookups.isPending} className={fieldClass}>
            <option value="">Not in a department</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="move-job-role" className="text-sm font-semibold text-foreground">Job role</label>
          <select id="move-job-role" value={form.jobRoleId} onChange={set("jobRoleId")} disabled={lookups.isPending} className={fieldClass}>
            <option value="">No job role</option>
            {jobRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </div>
      </div>

      <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
        <li>If you change the team, pick the department it belongs to as well.</li>
        {memberTeams.length > 1 && <li>They're in {memberTeams.length} teams now. Saving keeps only the team chosen here.</li>}
        {(leads.length > 0 || heads.length > 0) && (
          <li>They still lead {[...leads, ...heads].join(", ")}. Change who leads a team or heads a department on the org chart, in Arrange.</li>
        )}
        <li>A promotion belongs in Promote instead, so it shows on their timeline as one.</li>
      </ul>

      {problem && (
        <div role="alert" className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{problem.title}</p>
          {problem.detail && <p className="text-sm leading-6 text-muted-foreground">{problem.detail}</p>}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={candidateStyles.ghost}>{problem ? "Close" : "Cancel"}</button>
        <button type="submit" disabled={assign.isPending || !changed} className={primaryButton}>{assign.isPending ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}

/**
 * Admins: change who someone reports to, their designation, team, department and job role with
 * `assign`. The role needs "Everyone" update access on Employees.
 */
export default function MoveEmployeeDialog({ person, onClose }) {
  const id = person?.id ?? person?.employee_id;
  const detail = useEmployee(id);
  const employee = detail.data?.employee;
  return (
    <ActionDialog
      open
      onClose={onClose}
      title={`Change ${personName(employee ?? person)}'s place`}
      description="Who they report to, their designation, job role, and the team and department they're in. Each change is logged on their timeline."
    >
      {detail.isPending ? (
        <Skeleton count={3} height={44} borderRadius={12} />
      ) : detail.isError || !employee ? (
        <p role="alert" className="text-sm text-muted-foreground">{detail.error?.message || "This person couldn't be loaded."}</p>
      ) : (
        <MoveForm key={employee.id} employee={{ ...employee, id: employee.id ?? id }} onClose={onClose} />
      )}
    </ActionDialog>
  );
}
