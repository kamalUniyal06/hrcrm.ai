import { useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { toast } from "react-hot-toast";
import { GripVertical, Layers, Lock, Pencil, Plus, UserX, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssignEmployee, useLookups, useOrgTree, useSaveDepartment, useSaveTeam } from "../../../queries/hr.queries";
import { useHrAccess } from "../../../hooks/useHrAccess";
import { structureError } from "../../../utils/hrAccess";
import { buildStructure, movePerson, moveTeamTo, personName, zoneTarget } from "../../../utils/hrOrg";
import { candidateStyles } from "../candidate/candidateStyles";
import { ActionDialog, ConsoleLink, PersonAvatar, QueryState, fieldClass, primaryButton } from "./orgUi";
import MoveEmployeeDialog from "./MoveEmployeeDialog";

const byName = (a, b) => personName(a).localeCompare(personName(b));
const NO_DEPARTMENT = "teams:none";
const selectClass = "min-h-9 min-w-0 max-w-full rounded-md border border-border bg-card px-2 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";

// Only what changed on an edit, so a department under two branches isn't re-linked to one.
const changedFields = (before, after) => Object.fromEntries(Object.entries(after).filter(([key, value]) => value !== (before[key] ?? "")));

const patchTeams = (board, teamId, patch) => {
  const change = (teams) => teams.map((team) => (team.id === teamId ? { ...team, ...patch } : team));
  return { ...board, departments: board.departments.map((department) => ({ ...department, teams: change(department.teams) })), looseTeams: change(board.looseTeams) };
};
const patchDepartment = (board, departmentId, patch) => ({
  ...board,
  departments: board.departments.map((department) => (department.id === departmentId ? { ...department, ...patch } : department)),
});

function PersonChip({ person, zoneId, index, canEdit, onOpen }) {
  return (
    // The chip is a button (click opens Change place); the library won't drag from buttons unless told to.
    <Draggable draggableId={`${zoneId}|${person.id}`} index={index} isDragDisabled={!canEdit} disableInteractiveElementBlocking>
      {(provided, snapshot) => (
        <li ref={provided.innerRef} {...provided.draggableProps}>
          <button
            type="button"
            {...provided.dragHandleProps}
            onClick={() => onOpen(person)}
            aria-label={`${personName(person)}. ${canEdit ? "Press space to pick up and move, or Enter to change their place." : "Open to see their place."}`}
            className={cn(
              "flex min-h-10 w-full items-center gap-2 rounded-lg border border-border bg-card px-2 py-1 text-left text-sm text-foreground transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none",
              snapshot.isDragging && "border-primary shadow-lg",
            )}
          >
            <PersonAvatar person={person} className="size-7 text-[10px]" />
            <span className="min-w-0 flex-1 truncate">{personName(person)}</span>
          </button>
        </li>
      )}
    </Draggable>
  );
}

function PeopleZone({ zoneId, people, canEdit, onOpen, empty }) {
  return (
    <Droppable droppableId={zoneId} type="PERSON" isDropDisabled={!canEdit}>
      {(provided, snapshot) => (
        <ul
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn("max-h-72 min-h-12 space-y-1.5 overflow-y-auto rounded-lg p-1.5 transition-colors motion-reduce:transition-none", snapshot.isDraggingOver ? "bg-primary/10 ring-2 ring-primary/40" : "bg-muted/50")}
        >
          {people.map((person, index) => <PersonChip key={person.id} person={person} zoneId={zoneId} index={index} canEdit={canEdit} onOpen={onOpen} />)}
          {provided.placeholder}
          {!people.length && !snapshot.isDraggingOver && <li className="px-2 py-2 text-xs text-muted-foreground">{empty}</li>}
        </ul>
      )}
    </Droppable>
  );
}

function PersonPicker({ id, label, value, employees, disabled, onChange }) {
  return (
    <label className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <span className="shrink-0">{label}</span>
      <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={selectClass}>
        <option value="">None</option>
        {employees.map((employee) => <option key={employee.id} value={employee.id}>{personName(employee)}</option>)}
      </select>
    </label>
  );
}

function TeamCard({ team, index, canEdit, employees, onLead, onEdit, onOpen }) {
  return (
    <Draggable draggableId={`team-drag:${team.id}`} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <li ref={provided.innerRef} {...provided.draggableProps} className={cn("rounded-xl border border-border bg-background p-2", snapshot.isDragging && "border-primary shadow-lg")}>
          <div className="flex items-center gap-1">
            <span {...provided.dragHandleProps} aria-label={`Move team ${team.name} to another department`} className={cn("grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground", canEdit && "cursor-grab hover:bg-accent hover:text-foreground")}>
              <GripVertical size={16} aria-hidden="true" />
            </span>
            <Users size={15} className="shrink-0 text-primary" aria-hidden="true" />
            <h4 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{team.name}</h4>
            <span className="text-xs tabular-nums text-muted-foreground">{team.members.length + (team.lead ? 1 : 0)}</span>
            {canEdit && (
              <button type="button" onClick={() => onEdit(team)} aria-label={`Edit team ${team.name}`} className={candidateStyles.iconButton}><Pencil size={15} aria-hidden="true" /></button>
            )}
          </div>
          <div className="mt-1 mb-2 px-1">
            <PersonPicker id={`lead-${team.id}`} label="Lead" value={team.lead?.id ?? ""} employees={employees} disabled={!canEdit} onChange={(leadId) => onLead(team, leadId)} />
          </div>
          <PeopleZone zoneId={`team:${team.id}`} people={team.members} canEdit={canEdit} onOpen={onOpen} empty="Drop people here to add them to this team." />
        </li>
      )}
    </Draggable>
  );
}

function TeamList({ droppableId, teams, canEdit, employees, onLead, onEdit, onOpen, empty }) {
  return (
    <Droppable droppableId={droppableId} type="TEAM" isDropDisabled={!canEdit}>
      {(provided, snapshot) => (
        <ul ref={provided.innerRef} {...provided.droppableProps} className={cn("min-h-12 space-y-2 rounded-lg transition-colors motion-reduce:transition-none", snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/30")}>
          {teams.map((team, index) => (
            <TeamCard key={team.id} team={team} index={index} canEdit={canEdit} employees={employees} onLead={onLead} onEdit={onEdit} onOpen={onOpen} />
          ))}
          {provided.placeholder}
          {!teams.length && !snapshot.isDraggingOver && <li className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">{empty}</li>}
        </ul>
      )}
    </Droppable>
  );
}

/** New or existing team: name, lead, department. */
function TeamDialog({ team, employees, departments, onClose }) {
  const save = useSaveTeam();
  const [form, setForm] = useState({ name: team.name ?? "", leadId: team.lead?.id ?? "", departmentId: team.departmentId ?? "" });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    const before = { name: team.name, team_lead_employee_id: team.lead?.id, department_id: team.departmentId };
    const after = { name: form.name.trim(), team_lead_employee_id: form.leadId, department_id: form.departmentId };
    save.mutate(
      { id: team.id, ...(team.id ? changedFields(before, after) : after) },
      { onSuccess: () => { toast.success(team.id ? "Team saved" : `Team ${form.name.trim()} created`); onClose(); }, onError: (error) => toast.error(structureError(error)) },
    );
  };
  return (
    <ActionDialog open onClose={onClose} title={team.id ? `Edit ${team.name}` : "New team"} description="Members are added by dragging people onto the team.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="team-name" className="text-sm font-semibold text-foreground">Name</label>
          <input id="team-name" required maxLength={150} value={form.name} onChange={set("name")} className={fieldClass} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="team-lead" className="text-sm font-semibold text-foreground">Team lead</label>
            <select id="team-lead" value={form.leadId} onChange={set("leadId")} className={fieldClass}>
              <option value="">No lead yet</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{personName(employee)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="team-department" className="text-sm font-semibold text-foreground">Department</label>
            <select id="team-department" value={form.departmentId} onChange={set("departmentId")} className={fieldClass}>
              <option value="">No department</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={candidateStyles.ghost}>Cancel</button>
          <button type="submit" disabled={save.isPending || !form.name.trim()} className={primaryButton}>{save.isPending ? "Saving…" : team.id ? "Save team" : "Create team"}</button>
        </div>
      </form>
    </ActionDialog>
  );
}

/** New or existing department: name, head, branch. */
function DepartmentDialog({ department, employees, branches, onClose }) {
  const save = useSaveDepartment();
  const [form, setForm] = useState({ name: department.name ?? "", headId: department.head?.id ?? "", branchId: department.branchId ?? "" });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    const before = { name: department.name, manager_employee_id: department.head?.id, branch_id: department.branchId };
    const after = { name: form.name.trim(), manager_employee_id: form.headId, branch_id: form.branchId };
    save.mutate(
      { id: department.id, ...(department.id ? changedFields(before, after) : after) },
      { onSuccess: () => { toast.success(department.id ? "Department saved" : `Department ${form.name.trim()} created`); onClose(); }, onError: (error) => toast.error(structureError(error)) },
    );
  };
  return (
    <ActionDialog open onClose={onClose} title={department.id ? `Edit ${department.name}` : "New department"} description="Teams are added by dragging them onto the department, or by picking it on the team.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="department-name" className="text-sm font-semibold text-foreground">Name</label>
          <input id="department-name" required maxLength={150} value={form.name} onChange={set("name")} className={fieldClass} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="department-head" className="text-sm font-semibold text-foreground">Department head</label>
            <select id="department-head" value={form.headId} onChange={set("headId")} className={fieldClass}>
              <option value="">No head yet</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{personName(employee)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="department-branch" className="text-sm font-semibold text-foreground">Branch</label>
            <select id="department-branch" value={form.branchId} onChange={set("branchId")} className={fieldClass}>
              <option value="">No branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={candidateStyles.ghost}>Cancel</button>
          <button type="submit" disabled={save.isPending || !form.name.trim()} className={primaryButton}>{save.isPending ? "Saving…" : department.id ? "Save department" : "Create department"}</button>
        </div>
      </form>
    </ActionDialog>
  );
}

/**
 * Arrange the organisation by dragging: people onto a team, a department ("Not in a team") or
 * "Not assigned"; teams onto another department. Leads and heads are picked on each card, and
 * teams and departments are created or renamed here. Changes show at once and roll back if the
 * backend refuses them. Needs "Everyone" update access on Employees.
 */
export default function OrgStructureBoard() {
  const access = useHrAccess();
  const tree = useOrgTree();
  const lookups = useLookups();
  const assign = useAssignEmployee();
  const saveTeam = useSaveTeam();
  const saveDepartment = useSaveDepartment();
  const canEdit = access.scopeOf("employees", "update") === "all";
  const server = useMemo(() => buildStructure(tree.data), [tree.data]);
  // Shown until the org tree is fetched again after the last pending change.
  const [draft, setDraft] = useState(null);
  const [pending, setPending] = useState(0);
  const [opening, setOpening] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const board = draft && (pending > 0 || draft.at === tree.dataUpdatedAt) ? draft.board : server;
  const employees = useMemo(() => [...(lookups.data?.employees ?? [])].filter((employee) => employee.id).sort(byName), [lookups.data]);
  const branches = lookups.data?.branches ?? [];

  const change = (next, mutation, variables, done) => {
    setDraft({ board: next, at: tree.dataUpdatedAt });
    setPending((count) => count + 1);
    mutation.mutate(variables, {
      onSuccess: () => done && toast.success(done),
      onError: (error) => {
        setDraft(null);
        toast.error(structureError(error));
      },
      onSettled: () => setPending((count) => count - 1),
    });
  };

  const onDragEnd = ({ source, destination, draggableId, type }) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    if (type === "TEAM") {
      const teamId = draggableId.slice("team-drag:".length);
      const departmentId = destination.droppableId === NO_DEPARTMENT ? "" : destination.droppableId.slice("teams:".length);
      change(moveTeamTo(board, teamId, departmentId), saveTeam, { id: teamId, department_id: departmentId }, "Team moved");
      return;
    }
    const personId = draggableId.split("|")[1];
    const everyone = [...board.unassigned, ...board.looseTeams.flatMap((team) => team.members), ...board.departments.flatMap((department) => [...department.members, ...department.teams.flatMap((team) => team.members)])];
    const person = everyone.find((item) => item.id === personId) ?? { id: personId, name: "Employee" };
    change(movePerson(board, person, destination.droppableId), assign, { employeeId: personId, changes: zoneTarget(board, destination.droppableId) }, `${personName(person)} moved`);
  };

  const setLead = (team, leadId) =>
    change(patchTeams(board, team.id, { lead: employees.find((employee) => employee.id === leadId) ?? null }), saveTeam, { id: team.id, team_lead_employee_id: leadId }, "Team lead updated");
  const setHead = (department, headId) =>
    change(patchDepartment(board, department.id, { head: employees.find((employee) => employee.id === headId) ?? null }), saveDepartment, { id: department.id, manager_employee_id: headId }, "Department head updated");
  const editTeam = (team, departmentId) => setEditingTeam({ ...team, departmentId });
  const teamProps = { canEdit, employees, onLead: setLead, onOpen: setOpening };

  return (
    <QueryState query={tree} rows={6}>
      <div className="space-y-4">
        {!canEdit ? (
          <p role="note" className="flex items-start gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm leading-6 text-foreground">
            <Lock size={16} className="mt-1 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              You can look, but not rearrange. Moving people and editing teams needs <span className="font-semibold">Everyone</span> update access on Employees in your role.{" "}
              <ConsoleLink tab="Roles & permissions" className="mt-2 min-h-9">Open HR console</ConsoleLink>
            </span>
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {pending > 0 ? "Saving…" : "Drag people between teams, or a team by its handle to another department. Select a person for manager, designation and job role."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setEditingTeam({})} className={candidateStyles.ghost} data-tour="org-new-team"><Plus size={16} aria-hidden="true" /> New team</button>
              <button type="button" onClick={() => setEditingDepartment({})} className={primaryButton}><Plus size={16} aria-hidden="true" /> New department</button>
            </div>
          </div>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <ul className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3" aria-label="Departments" data-tour="org-board">
              {board.departments.map((department) => (
                <li key={department.id} className={cn(candidateStyles.card, "space-y-3 p-3")}>
                  <div className="flex items-center gap-2">
                    <span className={candidateStyles.tile}><Layers size={18} aria-hidden="true" /></span>
                    <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{department.name}</h3>
                    {canEdit && (
                      <button type="button" onClick={() => setEditingDepartment(department)} aria-label={`Edit department ${department.name}`} className={candidateStyles.iconButton}><Pencil size={15} aria-hidden="true" /></button>
                    )}
                  </div>
                  <PersonPicker id={`head-${department.id}`} label="Head" value={department.head?.id ?? ""} employees={employees} disabled={!canEdit} onChange={(headId) => setHead(department, headId)} />
                  <TeamList droppableId={`teams:${department.id}`} teams={department.teams} {...teamProps} onEdit={(team) => editTeam(team, department.id)} empty="No teams. Drag a team here, or create one." />
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Not in a team</p>
                    <PeopleZone zoneId={`department:${department.id}`} people={department.members} canEdit={canEdit} onOpen={setOpening} empty="Drop people here to put them in the department without a team." />
                  </div>
                  {canEdit && (
                    <button type="button" onClick={() => editTeam({}, department.id)} className={cn(candidateStyles.ghost, "w-full justify-center")}><Plus size={15} aria-hidden="true" /> Team in {department.name}</button>
                  )}
                </li>
              ))}
              {!board.departments.length && <li className={cn(candidateStyles.card, "px-4 py-6 text-sm text-muted-foreground")}>No departments yet. Create the first one.</li>}
            </ul>

            <aside className="space-y-4 lg:sticky lg:top-4">
              <section aria-labelledby="board-unassigned" className={cn(candidateStyles.card, "space-y-2 p-3")}>
                <h3 id="board-unassigned" className="flex items-center gap-2 text-sm font-semibold text-foreground"><UserX size={16} className="text-muted-foreground" aria-hidden="true" /> Not assigned</h3>
                <PeopleZone zoneId="none" people={board.unassigned} canEdit={canEdit} onOpen={setOpening} empty="Drop people here to take them out of every team and department." />
              </section>
              <section aria-labelledby="board-loose-teams" className={cn(candidateStyles.card, "space-y-2 p-3")}>
                <h3 id="board-loose-teams" className="text-sm font-semibold text-foreground">Teams without a department</h3>
                <TeamList droppableId={NO_DEPARTMENT} teams={board.looseTeams} {...teamProps} onEdit={(team) => editTeam(team, "")} empty="Drag a team here to take it out of its department." />
              </section>
            </aside>
          </div>
        </DragDropContext>
      </div>

      {opening && <MoveEmployeeDialog person={opening} onClose={() => setOpening(null)} />}
      {editingTeam && <TeamDialog team={editingTeam} employees={employees} departments={board.departments} onClose={() => setEditingTeam(null)} />}
      {editingDepartment && <DepartmentDialog department={editingDepartment} employees={employees} branches={branches} onClose={() => setEditingDepartment(null)} />}
    </QueryState>
  );
}
