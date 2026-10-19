import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarDays,
  Info,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  PhoneOff,
  Save,
  UserRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  employeeDate,
  employeeName,
  fetchEmployee,
  formatJoinDate,
  saveEmployee,
  tenure,
} from "./employeesApi";

const groups = [
  [
    "Personal & contact",
    UserRound,
    [
      ["first_name", "First name"],
      ["last_name", "Last name"],
      ["email1", "Email", "email"],
      ["phone_mobile", "Mobile phone", "tel"],
      ["phone_work", "Work phone", "tel"],
    ],
  ],
  [
    "Employment",
    Briefcase,
    [
      ["current_designation", "Designation"],
      ["title", "Title"],
      ["department", "Department"],
      ["joining_date", "Joining date", "date"],
    ],
  ],
  [
    "Location",
    MapPin,
    [
      ["primary_address_street", "Street"],
      ["primary_address_city", "City"],
      ["primary_address_state", "State"],
      ["primary_address_postalcode", "Postal code"],
      ["primary_address_country", "Country"],
    ],
  ],
  [
    "Additional information",
    Info,
    [
      ["linkedin_url", "LinkedIn URL", "url"],
      ["description", "Notes", "textarea"],
    ],
  ],
];
const fields = [
  ...groups.flatMap(([, , entries]) => entries),
  ["do_not_call", "Do not call"],
];
const normalize = (record) =>
  Object.fromEntries(
    fields.map(([key]) => [
      key,
      key === "joining_date"
        ? employeeDate(record[key])
        : String(record[key] || (key === "do_not_call" ? "0" : "")).trim(),
    ]),
  );
const AVATAR_COLORS = [
  "bg-indigo-50 text-indigo-600",
  "bg-sky-50 text-sky-600",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-600",
  "bg-violet-50 text-violet-600",
];
const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50";

// Initials on a colour picked from the name, so each person keeps the same colour.
export function EmployeeAvatar({ name, size = "md" }) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  const color = AVATAR_COLORS[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLORS.length];
  const sizes = { md: "h-10 w-10 text-xs", lg: "h-12 w-12 text-sm", xl: "h-16 w-16 text-lg" };
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${color}`}>
      {initials}
    </span>
  );
}

function FieldValue({ field, value }) {
  if (!value) return <span className="text-slate-400">—</span>;
  if (field === "email1") return <a href={`mailto:${value}`} className="text-indigo-600 hover:underline">{value}</a>;
  if (field === "phone_mobile" || field === "phone_work") return <a href={`tel:${value}`} className="text-indigo-600 hover:underline">{value}</a>;
  if (field === "linkedin_url") return <a href={/^https?:\/\//.test(value) ? value : `https://${value}`} target="_blank" rel="noreferrer" className="break-all text-indigo-600 hover:underline">{value}</a>;
  if (field === "joining_date") return formatJoinDate(value);
  return <span className="whitespace-pre-wrap break-words">{value}</span>;
}

export default function EmployeeDetails({ selection, departments = [], onClose }) {
  const client = useQueryClient();
  const isNew = !selection.id;
  const query = useQuery({
    queryKey: ["employees", "detail", selection.id],
    queryFn: () => fetchEmployee(selection.id),
    enabled: !isNew,
  });
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(isNew || selection.edit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const original = normalize(query.data || {});
  const values = draft || original;
  const changed = fields.filter(([key]) => values[key] !== original[key]);
  const name = isNew ? employeeName(values) : employeeName(query.data || values);
  const designation = values.current_designation || values.title;
  const doNotCall = values.do_not_call === "1";

  function update(key, value) {
    setDraft({ ...values, [key]: value });
    setConfirmClose(false);
  }
  function close() {
    if (busy) return;
    if (changed.length) setConfirmClose(true);
    else onClose();
  }
  function cancelEdit() {
    if (isNew) return close();
    setDraft(null);
    setError("");
    setEditing(false);
    setConfirmClose(false);
  }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    if (!values.last_name.trim()) {
      setError("Last name is required.");
      return;
    }
    setBusy(true);
    setError("");
    const data = Object.fromEntries(
      (isNew ? fields : changed).map(([key]) => [key, values[key].trim()]),
    );
    if (isNew || "first_name" in data || "last_name" in data)
      data.name = employeeName(values);
    if (data.joining_date) {
      const [year, month, day] = data.joining_date.split("-");
      data.joining_date = `${day}/${month}/${year}`;
    }
    try {
      await saveEmployee(selection.id, data);
      await client.invalidateQueries({ queryKey: ["employees"] });
      toast.success(isNew ? "Employee created" : "Employee updated");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[999] bg-slate-950/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-2xl flex-col bg-slate-50 shadow-2xl outline-none sm:rounded-l-2xl">
          <header className="border-b border-slate-200 bg-white px-6 pb-5 pt-4 sm:rounded-tl-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                {isNew ? "New employee" : editing ? "Editing profile" : "Employee profile"}
              </p>
              <button
                type="button"
                aria-label="Close employee details"
                disabled={busy}
                onClick={close}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <EmployeeAvatar name={isNew && !values.first_name && !values.last_name ? "New employee" : name} size="xl" />
              <div className="min-w-0">
                <Dialog.Title className="truncate text-xl font-semibold text-slate-900">
                  {isNew && !values.first_name && !values.last_name ? "Add employee" : name}
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 truncate text-sm text-slate-500">
                  {isNew ? "Fill in the details below to create a profile." : designation || "No designation"}
                </Dialog.Description>
                {!isNew && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {values.department && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
                        <Building2 size={12} />
                        {values.department}
                      </span>
                    )}
                    {values.joining_date && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                        <CalendarDays size={12} />
                        Joined {formatJoinDate(values.joining_date)}
                        {tenure(values.joining_date) && ` · ${tenure(values.joining_date)}`}
                      </span>
                    )}
                    {doNotCall && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700">
                        <PhoneOff size={12} />
                        Do not call
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {!isNew && !editing && (values.email1 || values.phone_mobile || values.phone_work || values.linkedin_url) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {values.email1 && (
                  <a href={`mailto:${values.email1}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600">
                    <Mail size={14} />Email
                  </a>
                )}
                {(values.phone_mobile || values.phone_work) && !doNotCall && (
                  <a href={`tel:${values.phone_mobile || values.phone_work}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600">
                    <Phone size={14} />Call
                  </a>
                )}
                {values.linkedin_url && (
                  <a href={/^https?:\/\//.test(values.linkedin_url) ? values.linkedin_url : `https://${values.linkedin_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600">
                    <Linkedin size={14} />LinkedIn
                  </a>
                )}
              </div>
            )}
          </header>

          {confirmClose && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} />
                You have unsaved changes.
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmClose(false)} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold">
                  Keep editing
                </button>
                <button type="button" onClick={onClose} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                  Discard and close
                </button>
              </div>
            </div>
          )}

          {!isNew && query.isPending ? (
            <p role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Loading employee…
            </p>
          ) : !isNew && query.isError ? (
            <p role="alert" className="m-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {query.error.message}{" "}
              <button type="button" onClick={() => query.refetch()} className="font-semibold underline">
                Retry
              </button>
            </p>
          ) : (
            <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {error && (
                  <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </p>
                )}
                {groups.map((group) => {
                  const [title, Icon, entries] = group;
                  return (
                  <section key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
                        <Icon size={15} />
                      </span>
                      {title}
                    </h2>
                    {editing ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {entries.map(([key, label, type = "text"]) => (
                          <label
                            key={key}
                            className={`text-xs font-medium text-slate-600 ${type === "textarea" || key === "primary_address_street" ? "sm:col-span-2" : ""}`}
                          >
                            {label}
                            {key === "last_name" && <span className="text-rose-500"> *</span>}
                            {type === "textarea" ? (
                              <textarea
                                rows={4}
                                disabled={busy}
                                value={values[key]}
                                onChange={(event) => update(key, event.target.value)}
                                className={inputClass}
                              />
                            ) : (
                              <input
                                type={type}
                                required={key === "last_name"}
                                disabled={busy}
                                list={key === "department" ? "employee-departments" : undefined}
                                value={values[key]}
                                onChange={(event) => update(key, event.target.value)}
                                className={inputClass}
                              />
                            )}
                          </label>
                        ))}
                        {title === "Personal & contact" && (
                          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
                            <input
                              type="checkbox"
                              disabled={busy}
                              checked={doNotCall}
                              onChange={(event) => update("do_not_call", event.target.checked ? "1" : "0")}
                              className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                            />
                            Do not call this employee
                          </label>
                        )}
                      </div>
                    ) : (
                      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                        {entries.map(([key, label, type]) => (
                          <div key={key} className={type === "textarea" || key === "primary_address_street" ? "sm:col-span-2" : ""}>
                            <dt className="text-xs text-slate-400">{label}</dt>
                            <dd className="mt-1 text-sm font-medium text-slate-800">
                              <FieldValue field={key} value={values[key]} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </section>
                  );
                })}
                <datalist id="employee-departments">
                  {departments.map((item) => <option key={item} value={item} />)}
                </datalist>
              </div>
              <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
                <p className="text-xs text-slate-400">
                  {editing && !isNew ? (changed.length ? `${changed.length} unsaved change${changed.length > 1 ? "s" : ""}` : "No changes yet") : ""}
                </p>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={cancelEdit}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        key="save"
                        type="submit"
                        disabled={busy || (!isNew && !changed.length)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isNew ? "Create employee" : "Save changes"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={close}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                      >
                        Close
                      </button>
                      <button
                        key="edit"
                        type="button"
                        onClick={() => setEditing(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                      >
                        <Pencil size={16} />
                        Edit employee
                      </button>
                    </>
                  )}
                </div>
              </footer>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
