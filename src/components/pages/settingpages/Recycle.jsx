import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckSquare,
  Database,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  SquarePen,
} from "lucide-react";
import { toast } from "react-toastify";
import { http } from "../../../services/api";
import Header from "./Header";

const MODULE_NAME = "outr_Outright_Record_Restore_Manager";

const COLUMNS = [
  {
    label: "Name",
    accessor: "name",
    className: "min-w-[260px]",
    render: (row) => row.name || "-",
  },
  {
    label: "Module Name",
    accessor: "record_module",
    className: "min-w-[170px]",
    render: (row) => row.record_module || "-",
  },
  {
    label: "Deleted By",
    accessor: "deleted_by",
    className: "min-w-[150px]",
    render: (row) =>
      row.deleted ||
      "-",
  },
  {
    label: "Deleted By (old)",
    accessor: "legacy",
    className: "min-w-[170px]",
    render: (row) => row.old_data || "-",
  },
  {
    label: "Date on which deleted",
    accessor: "date_modified",
    className: "min-w-[210px]",
    render: (row) => row.date_modified  || "-",
  },
  {
    label: "Restore",
    accessor: "restore",
    className: "min-w-[120px]",
    render: (row) => row.description || "-",
  },
  {
    label: "Record Id",
    accessor: "record_id",
    className: "min-w-[300px]",
    render: (row) => row.record_id || "-",
  },
];

const truncate = (value, limit = 120) => {
  if (value === null || value === undefined || value === "") return "-";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Something went wrong";

const RecyclePage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });
  const [selectedRows, setSelectedRows] = useState([]);
  const [restoringId, setRestoringId] = useState("");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await http({
        method: "POST",
        body: {
          action: "fetch",
          module: MODULE_NAME,
          fields: [
            "id",
            "name",
            "date_entered",
            "date_modified",
            "description",
            "deleted",
            "record_id",
            "record_module",
            "old_data",
            "legacy",
            "restore",
            "deleted_by",
            "deleted_by_name",
            "modified_by_name",
            "created_by_name",
          ],
          search: appliedSearch || undefined,
          search_fields: ["name", "record_module", "record_id"],
          order_by: "date_modified",
          order_dir: "DESC",
          page,
          per_page: perPage,
        },
      });

      setRecords(Array.isArray(response?.records) ? response.records : []);
      setPagination({
        total: Number(response?.total || 0),
        totalPages: Number(response?.total_pages || 1),
      });
      setSelectedRows([]);
    } catch (err) {
      setRecords([]);
      setPagination({ total: 0, totalPages: 1 });
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, perPage]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const visibleRange = useMemo(() => {
    if (!pagination.total) return "0 - 0";
    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, pagination.total);
    return `${start} - ${end}`;
  }, [page, pagination.total, perPage]);

  const allCurrentRowsSelected =
    records.length > 0 && selectedRows.length === records.length;

  const toggleAllRows = () => {
    setSelectedRows(allCurrentRowsSelected ? [] : records.map((row) => row.id));
  };

  const toggleRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleRestore = async (row) => {
    if (!row?.id) return;

    setRestoringId(row.id);
    setError("");

    try {
      if (row.record_module && row.record_id) {
        await http({
          method: "POST",
          body: {
            action: "update",
            module: row.record_module,
            id: row.record_id,
            data: { deleted: 0 },
          },
        });
      }

      await http({
        method: "POST",
        body: {
          action: "update",
          module: MODULE_NAME,
          id: row.id,
          data: { deleted: 1 },
        },
      });

      toast.success("Record restored successfully");
      fetchRecords();
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message || "Restore failed");
    } finally {
      setRestoringId("");
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const nextSearch = search.trim();
    setPage(1);
    setAppliedSearch(nextSearch);
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8">
      <Header text="Recycle Bin" />

      <div className="mt-5 rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleAllRows}
              className="inline-flex h-8 items-center gap-2 rounded border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              title="Select rows"
            >
              <CheckSquare className="h-4 w-4" />
              <span>{selectedRows.length || ""}</span>
            </button>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex min-w-[260px] max-w-md flex-1 items-center gap-2 sm:flex-initial"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, module, or record id"
                className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <span>
              ({visibleRange} of {pagination.total})
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1 || loading}
              className="rounded border border-slate-300 bg-white px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.min(pagination.totalPages, value + 1))
              }
              disabled={page >= pagination.totalPages || loading}
              className="rounded border border-slate-300 bg-white px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
            <button
              type="button"
              onClick={fetchRecords}
              disabled={loading}
              className="rounded border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-left text-[11px] font-semibold text-slate-900">
                <th className="w-10 px-2 py-2">
                  <input
                    type="checkbox"
                    checked={allCurrentRowsSelected}
                    onChange={toggleAllRows}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
                <th className="w-9 px-2 py-2" />
                {COLUMNS.map((column) => (
                  <th
                    key={column.accessor}
                    className={`border-l border-slate-200 px-3 py-2 ${column.className}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={COLUMNS.length + 2} className="px-4 py-10">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      Loading recycle records...
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                records.map((row) => (
                  <tr
                    key={row.id || row.record_id}
                    className="border-b border-slate-200 hover:bg-blue-50/40"
                  >
                    <td className="px-2 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-2 py-2 align-top text-slate-500">
                      <SquarePen className="h-3.5 w-3.5" />
                    </td>
                    {COLUMNS.map((column) => (
                      <td
                        key={column.accessor}
                        className={`border-l border-slate-100 px-3 py-2 align-top text-slate-800 ${column.className}`}
                        title={String(row[column.accessor] ?? "")}
                      >
                        {column.accessor === "restore" ? (
                          <button
                            type="button"
                            onClick={() => handleRestore(row)}
                            disabled={restoringId === row.id}
                            className="inline-flex items-center gap-1 font-medium text-blue-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            {restoringId === row.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Restoring
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restore
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="block max-w-[420px] truncate">
                            {truncate(
                              column.render ? column.render(row) : row[column.accessor],
                            )}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 2} className="px-6 py-14">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="mb-3 rounded-md bg-slate-100 p-3 text-slate-500">
                        <Database className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        No recycle records found
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Deleted records from the recycle module will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecyclePage;
