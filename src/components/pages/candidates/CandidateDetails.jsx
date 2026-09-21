import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Pencil, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { candidateFields } from "../profile/candidateApi";
import {
  candidateName,
  fetchCandidateRecord,
  optionValue,
  updateCandidateRecord,
  workflowField,
  workflowFields,
  workflowModules,
  workflowValue,
} from "./candidatesApi";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500";
const groups = [
  [
    "Personal & contact",
    ["first_name", "last_name", "email1", "phone_mobile", "dob", "gender"],
  ],
  [
    "Professional background",
    [
      "current_designation",
      "title",
      "department",
      "linkedin_url",
      "github_url",
    ],
  ],
  [
    "Location",
    [
      "primary_address_street",
      "primary_address_city",
      "primary_address_state",
      "primary_address_postalcode",
      "primary_address_country",
    ],
  ],
  ["About the candidate", ["description"]],
];

export default function CandidateDetails({ id, lookups, onClose }) {
  const query = useQuery({
    queryKey: ["candidates", "detail", id],
    queryFn: () => fetchCandidateRecord(id),
    staleTime: 0,
  });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  function close() {
    if (busy) return;
    if (dirty) setConfirmClose(true);
    else onClose();
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
                Candidate details
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Review the profile and manage recruitment progress.
              </Dialog.Description>
            </div>
            <button
              aria-label="Close candidate details"
              disabled={busy}
              onClick={close}
              className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40"
            >
              <X size={20} />
            </button>
          </header>
          {confirmClose && (
            <div
              role="alert"
              className="border-b bg-amber-50 px-6 py-4 text-sm text-amber-900"
            >
              You have unsaved changes.
              <div className="mt-3 flex gap-4">
                <button
                  onClick={() => setConfirmClose(false)}
                  className="font-semibold underline"
                >
                  Keep editing
                </button>
                <button onClick={onClose} className="font-semibold underline">
                  Discard and close
                </button>
              </div>
            </div>
          )}
          {query.isPending ? (
            <p role="status" className="flex gap-2 p-6 text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Loading complete profile…
            </p>
          ) : query.isError ? (
            <div role="alert" className="p-6 text-red-700">
              {query.error.message}
              <button
                onClick={() => query.refetch()}
                className="ml-3 underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <CandidateForm
              record={query.data}
              lookups={lookups}
              setDirty={setDirty}
              setBusy={setBusy}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CandidateForm({ record, lookups, setDirty, setBusy }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState(record);
  const [original, setOriginal] = useState(record);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changed = Object.keys(draft).filter(
    (key) => draft[key] !== original[key],
  );
  function change(key, value) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setDirty(Object.keys(next).some((key) => next[key] !== original[key]));
  }
  async function save(event) {
    event.preventDefault();
    if (saving || !changed.length) return;
    setSaving(true);
    setBusy(true);
    setError("");
    const data = Object.fromEntries(changed.map((key) => [key, draft[key]]));
    try {
      await updateCandidateRecord(original.id, data);
      setOriginal(draft);
      setDirty(false);
      setEditing(false);
      client.setQueryData(["candidates", "detail", original.id], draft);
      client.setQueryData(["candidates", "list"], (records) =>
        records?.map((item) =>
          item.id === original.id ? { ...item, ...data } : item,
        ),
      );
      void client.invalidateQueries({ queryKey: ["candidates", "list"] });
      void client.invalidateQueries({ queryKey: ["candidate-profile"] });
      toast.success("Candidate updated");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setBusy(false);
    }
  }
  const known = new Set([
    ...Object.keys(candidateFields),
    ...Object.values(workflowFields),
    ...Object.keys(workflowModules).flatMap((kind) => [
      workflowField(original, kind),
      kind,
      `${kind}_name`,
    ]),
    "id",
    "deleted",
    "profile_image",
  ]);
  const additional = Object.entries(original).filter(
    ([key, value]) =>
      !known.has(key) &&
      value !== null &&
      value !== "" &&
      typeof value !== "object" &&
      !/password|token|secret/i.test(key),
  );
  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-7 overflow-y-auto p-6">
        <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-semibold text-indigo-700">
            {candidateName(draft).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold text-slate-900">
              {candidateName(draft)}
            </h2>
            <p className="break-all text-sm text-slate-500">
              {draft.email1 || "No email provided"}
            </p>
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <fieldset disabled={saving} className="space-y-7">
          <section>
            <h3 className="font-semibold text-slate-900">
              Recruitment progress
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {Object.keys(workflowModules).map((kind) => {
                const key = workflowField(original, kind);
                const lookup = lookups[kind];
                const options = lookup.data || [];
                const current = String(draft[key] ?? "");
                return (
                  <div key={kind}>
                    <label
                      className="text-sm font-medium capitalize text-slate-600"
                      htmlFor={`candidate-${kind}`}
                    >
                      {kind}
                    </label>
                    {editing ? (
                      <>
                        <select
                          id={`candidate-${kind}`}
                          className={inputClass}
                          disabled={!key || !lookup.isSuccess}
                          value={current}
                          onChange={(event) => change(key, event.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {current &&
                            !options.some(
                              (option) =>
                                optionValue(original, kind, option, options) ===
                                current,
                            ) && (
                              <option value={current}>
                                {workflowValue(draft, kind, options)}
                              </option>
                            )}
                          {options.map((option) => (
                            <option
                              key={option.id}
                              value={optionValue(
                                original,
                                kind,
                                option,
                                options,
                              )}
                            >
                              {option.name}
                            </option>
                          ))}
                        </select>
                        {!key && (
                          <p className="mt-1 text-xs text-amber-700">
                            No writable {kind} field was returned.
                          </p>
                        )}
                        {lookup.isPending && (
                          <p className="mt-1 text-xs text-slate-500">
                            Loading options…
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                        {workflowValue(draft, kind, options)}
                      </p>
                    )}
                    {lookup.isError && (
                      <button
                        type="button"
                        className="mt-2 text-xs text-red-700 underline"
                        onClick={() => lookup.refetch()}
                      >
                        Could not load {kind} options. Retry
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          {groups.map(([title, fields]) => (
            <section key={title}>
              <h3 className="border-b border-slate-100 pb-3 font-semibold text-slate-900">
                {title}
              </h3>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                {fields.map((key) => (
                  <div
                    key={key}
                    className={key === "description" ? "sm:col-span-2" : ""}
                  >
                    <label
                      htmlFor={`candidate-${key}`}
                      className="text-sm font-medium text-slate-500"
                    >
                      {key === "description"
                        ? "Description"
                        : candidateFields[key]}
                    </label>
                    {editing ? (
                      key === "description" ? (
                        <textarea
                          id={`candidate-${key}`}
                          rows={6}
                          value={draft[key] ?? ""}
                          onChange={(event) => change(key, event.target.value)}
                          className={inputClass}
                        />
                      ) : (
                        <input
                          id={`candidate-${key}`}
                          type={
                            key === "email1"
                              ? "email"
                              : key.includes("url")
                                ? "url"
                                : key === "phone_mobile"
                                  ? "tel"
                                  : "text"
                          }
                          value={draft[key] ?? ""}
                          onChange={(event) => change(key, event.target.value)}
                          className={inputClass}
                        />
                      )
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-900">
                        {String(draft[key] || "—")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          {!!additional.length && (
            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                Additional record details
              </summary>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {additional.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs capitalize text-slate-500">
                      {key.replaceAll("_", " ")}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </fieldset>
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
        <p role="status" className="text-xs text-slate-500">
          {saving
            ? "Saving changes…"
            : changed.length
              ? `${changed.length} unsaved field${changed.length === 1 ? "" : "s"}`
              : "Candidate profile"}
        </p>
        <div className="flex gap-3">
          {editing ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setDraft(original);
                  setDirty(false);
                  setEditing(false);
                  setError("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={saving || !changed.length}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save changes
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Pencil size={16} />
              Edit candidate
            </button>
          )}
        </div>
      </footer>
    </form>
  );
}
