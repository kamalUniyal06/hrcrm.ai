import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Pencil, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  employeeDate,
  employeeName,
  fetchEmployee,
  saveEmployee,
} from "./employeesApi";

const groups = [
  [
    "Personal & contact",
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
    [
      ["current_designation", "Designation"],
      ["title", "Title"],
      ["department", "Department"],
      ["joining_date", "Joining date", "date"],
    ],
  ],
  [
    "Location",
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
    [
      ["linkedin_url", "LinkedIn URL", "url"],
      ["description", "Notes", "textarea"],
    ],
  ],
];
const fields = [
  ...groups.flatMap(([, entries]) => entries),
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

export default function EmployeeDetails({ selection, onClose }) {
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
  function close() {
    if (busy) return;
    if (changed.length) setConfirmClose(true);
    else onClose();
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
        <Dialog.Overlay className="fixed inset-0 z-[999] bg-slate-950/45 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-3xl flex-col bg-white shadow-2xl"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <header className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <Dialog.Title className="text-xl font-semibold text-slate-900">
                {isNew ? "Add employee" : "Employee details"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Review and manage employee information.
              </Dialog.Description>
            </div>
            <button
              aria-label="Close employee details"
              disabled={busy}
              onClick={close}
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </header>
          {confirmClose && (
            <div
              role="alert"
              className="bg-amber-50 px-6 py-4 text-sm text-amber-900"
            >
              You have unsaved changes.
              <div className="mt-2 flex gap-4">
                <button
                  onClick={() => setConfirmClose(false)}
                  className="underline"
                >
                  Keep editing
                </button>
                <button onClick={onClose} className="underline">
                  Discard and close
                </button>
              </div>
            </div>
          )}
          {!isNew && query.isPending ? (
            <p role="status" className="flex gap-2 p-6">
              <Loader2 className="animate-spin" size={18} />
              Loading employee…
            </p>
          ) : !isNew && query.isError ? (
            <p role="alert" className="p-6 text-red-700">
              {query.error.message}{" "}
              <button onClick={() => query.refetch()} className="underline">
                Retry
              </button>
            </p>
          ) : (
            <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
                {groups.map(([title, entries]) => (
                  <section key={title}>
                    <h2 className="font-semibold text-slate-900">{title}</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {entries.map(([key, label, type = "text"]) => (
                        <label
                          key={key}
                          className={`text-sm text-slate-600 ${type === "textarea" ? "sm:col-span-2" : ""}`}
                        >
                          {label}
                          {key === "last_name" && " *"}
                          {type === "textarea" ? (
                            <textarea
                              rows={4}
                              disabled={!editing || busy}
                              value={values[key]}
                              onChange={(event) =>
                                setDraft({
                                  ...values,
                                  [key]: event.target.value,
                                })
                              }
                              className="mt-2 w-full rounded-xl border border-slate-200 p-3 disabled:bg-slate-50"
                            />
                          ) : (
                            <input
                              type={type}
                              required={key === "last_name"}
                              disabled={!editing || busy}
                              value={values[key]}
                              onChange={(event) =>
                                setDraft({
                                  ...values,
                                  [key]: event.target.value,
                                })
                              }
                              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500 disabled:bg-slate-50"
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    disabled={!editing || busy}
                    checked={
                      String(
                        draft?.do_not_call ?? query.data?.do_not_call ?? "0",
                      ) === "1"
                    }
                    onChange={(event) =>
                      setDraft({
                        ...values,
                        do_not_call: event.target.checked ? "1" : "0",
                      })
                    }
                  />
                  Do not call
                </label>
              </div>
              <footer className="flex justify-end gap-3 border-t border-slate-100 p-5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={close}
                  className="rounded-xl border px-4 py-2 text-sm"
                >
                  Close
                </button>
                {editing ? (
                  <button
                    type="submit"
                    disabled={busy || (!isNew && !changed.length)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {isNew ? "Create employee" : "Save changes"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white"
                  >
                    <Pencil size={16} />
                    Edit employee
                  </button>
                )}
              </footer>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
