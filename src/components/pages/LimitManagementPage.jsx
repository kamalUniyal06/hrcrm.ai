import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import { fetchAllRecords } from "./candidates/candidatesApi";
import PageAccessGuard from "../routing/PageAccessGuard";
import { smartGateway } from "../../services/api";

const clean = (value) => String(value ?? "").trim();
const columns = [
  ["name", "Name"],
  ["year", "Year"],
  ["month", "Month"],
  ["day", "Day"],
  ["hour", "Hour"],
  ["minutes", "Minutes"],
  ["actual_time", "Actual time"],
  ["status", "Status"],
];

export default function LimitManagementPage() {
  const { recordId } = useParams();
  return (
    <PageAccessGuard>
      {recordId ? <LimitManagementEditor /> : <LimitManagementRecords />}
    </PageAccessGuard>
  );
}

function LimitManagementRecords() {
  const query = useQuery({
    queryKey: ["limit-management", "list"],
    queryFn: () => fetchAllRecords("hrc_limit_management"),
  });
  const [search, setSearch] = useState("");
  const records = (query.data || []).filter(
    (record) =>
      columns.some(([field]) =>
        clean(record[field])
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ) ||
      [
        record.description,
        record.created_by_name,
        record.assigned_user_name,
      ].some((value) =>
        clean(value).toLowerCase().includes(search.trim().toLowerCase()),
      ),
  );

  return (
    <main className="min-h-full space-y-6 rounded-2xl bg-slate-50 p-3 sm:p-6">
      <header className="rounded-3xl bg-gradient-to-r from-sidebar-primary to-sidebar-secondary p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
          People workspace
        </p>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold">
          <Clock3 aria-hidden="true" />
          Limit management
        </h1>
        <p className="mt-3 text-sm text-slate-200">
          View and edit configured time and workflow limits.
        </p>
      </header>
      <section
        aria-label="Limit management records"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="font-semibold text-slate-900">Limit records</h2>
            <p className="mt-1 text-xs text-slate-500">
              {query.data?.length ?? "—"} records
            </p>
          </div>
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={query.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
        <label className="m-5 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search size={16} className="text-slate-400" />
          <input
            type="search"
            aria-label="Search limit records"
            placeholder="Search records"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-transparent py-2.5 text-sm outline-none"
          />
        </label>
        {query.isError ? (
          <div
            role="alert"
            className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {query.error.message}
            <button
              type="button"
              onClick={() => query.refetch()}
              className="ml-2 underline"
            >
              Retry
            </button>
          </div>
        ) : query.isPending ? (
          <p
            role="status"
            className="flex justify-center gap-2 p-16 text-sm text-slate-500"
          >
            <Loader2 size={18} className="animate-spin" />
            Loading limit records…
          </p>
        ) : records.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Created
                  </th>
                  {columns.map(([, label]) => (
                    <th key={label} scope="col" className="px-4 py-3">
                      {label}
                    </th>
                  ))}
                  
                  <th scope="col" className="px-4 py-3">
                    Description
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record, index) => (
                  <tr
                    key={record.id || index}
                    className="hover:bg-indigo-50/50"
                  >
                      <td className="whitespace-nowrap px-4 py-4">
                      {clean(
                        record.date_entered_uni_format || record.date_entered,
                      ) || "—"}
                    </td>
                    {columns.map(([field]) => (
                      <td key={field} className="whitespace-nowrap px-4 py-4">
                        {clean(record[field]) || "—"}
                      </td>
                    ))}
                  
                    <td className="max-w-56 px-4 py-4">
                      <span
                        className="block truncate"
                        title={record.description}
                      >
                        {clean(record.description) || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        aria-label={`Edit ${clean(record.name) || "limit record"}`}
                        to={`/limit-management/${encodeURIComponent(record.id)}/edit`}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-white"
                      >
                        <Pencil size={15} />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-16 text-center text-sm text-slate-500">
            {search ? "No matching limit records." : "No limit records found."}
          </p>
        )}
      </section>
    </main>
  );
}

const editableFields = [
  ["name", "Name"],
  ["year", "Year"],
  ["month", "Month"],
  ["day", "Day"],
  ["hour", "Hour"],
  ["minutes", "Minutes"],
  ["actual_time", "Actual time"],
  ["status", "Status"],
  ["description", "Description"],
];

function LimitManagementEditor() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["limit-management", "list"],
    queryFn: () => fetchAllRecords("hrc_limit_management"),
  });
  const record = query.data?.find(
    (item) => String(item.id) === String(recordId),
  );
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (record)
      setForm(
        Object.fromEntries(
          editableFields.map(([field]) => [field, record[field] ?? ""]),
        ),
      );
  }, [record]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await smartGateway({
        method: "POST",
        body: {
          action: "update",
          module: "hrc_limit_management",
          id: recordId,
          data: form,
        },
      });
      if (response?.success !== true)
        throw new Error(
          response?.message ||
            response?.error ||
            "Could not save this limit record.",
        );
      await client.invalidateQueries({
        queryKey: ["limit-management", "list"],
      });
      navigate("/limit-management");
    } catch (saveError) {
      setError(saveError.message || "Could not save this limit record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-full space-y-6 rounded-2xl bg-slate-50 p-3 sm:p-6">
      <Link
        to="/limit-management"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600"
      >
        <ArrowLeft size={16} />
        Back to limit management
      </Link>
      <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 p-5">
          <h1 className="text-xl font-semibold text-slate-900">
            Edit limit record
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {record?.name || "Update module fields"}
          </p>
        </header>
        {query.isPending ? (
          <p
            role="status"
            className="flex justify-center gap-2 p-12 text-slate-500"
          >
            <Loader2 size={18} className="animate-spin" />
            Loading record…
          </p>
        ) : query.isError ? (
          <p
            role="alert"
            className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {query.error.message}
          </p>
        ) : !record ? (
          <p
            role="alert"
            className="m-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
          >
            This limit record could not be found.
          </p>
        ) : (
          <form onSubmit={save} className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {editableFields.map(([field, label]) => (
                <label
                  key={field}
                  className={`grid gap-1.5 text-sm font-medium text-slate-700 ${field === "description" ? "sm:col-span-2" : ""}`}
                >
                  {label}
                  {field === "description" ? (
                    <textarea
                      rows={4}
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-indigo-400"
                    />
                  ) : (
                    <input
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-indigo-400"
                    />
                  )}
                </label>
              ))}
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Link
                to="/limit-management"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save changes
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
