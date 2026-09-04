import { Calendar, Cable, ExternalLink, FileText, Link2, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { useTablePreference } from "../../hooks/useTablePreference";
import {
  useInfiniteBacklinks,
  useUpdateBacklink,
} from "../../queries/backlinks.queries";
import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";

const STATUS_OPTIONS = ["Added", "Removed"];

function StatusSelect({ row, updateStatus, savingId }) {
  const isSaving = savingId === row.id;

  return (
    <div className="relative inline-flex items-center">
      <select
        aria-label={`Status for ${row.name}`}
        value={row.status_c || "Added"}
        disabled={isSaving}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => updateStatus(row, event.target.value)}
        className={`min-w-[112px] cursor-pointer rounded-full border px-3 py-1.5 pr-8 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-teal-300 disabled:cursor-wait disabled:opacity-60 ${
          row.status_c === "Removed"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {isSaving && status === row.status_c ? "Updating..." : status}
          </option>
        ))}
      </select>
    </div>
  );
}

export function BacklinksPage({ title = "Backlinks", fixedFilters = null, onRecordClick }) {
  const storedPreferences = useTablePreference("backlinks");
  const preferences = useMemo(
    () => ({
      ...storedPreferences,
      filters: {
        ...(storedPreferences?.filters || {}),
        ...(fixedFilters || {}),
      },
    }),
    [storedPreferences, fixedFilters],
  );
  const [savingId, setSavingId] = useState(null);
  const navigate = useNavigate();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteBacklinks(preferences);
  const { mutate: updateBacklink } = useUpdateBacklink();

  const openRecord = (row) => {
    if (onRecordClick) onRecordClick(row, navigate);
  };

  const backlinks = data?.pages?.flatMap((page) => page.records || page.data || []) ?? [];
  const pages = data?.pages ?? [];
  const firstPage = pages[0] ?? {};
  const lastPage = pages[pages.length - 1] ?? {};

  const updateStatus = (row, status_c) => {
    if (status_c === row.status_c) return;

    setSavingId(row.id);
    updateBacklink(
      { id: row.id, status_c },
      {
        onSuccess: (response) => {
          if (response?.success === false) {
            toast.error(response.message || "Could not update the status.");
            return;
          }
          toast.success(`Status updated to ${status_c}`);
        },
        onError: (error) => {
          toast.error(error?.response?.data?.message || error?.message || "Could not update the status.");
        },
        onSettled: () => setSavingId(null),
      },
    );
  };

  const columns = [
    {
      label: "GP / LI Date",
      accessor: "gp_li_date_c",
      icon: Calendar,
      render: (row) => (
        <span className="font-medium text-slate-700">{row.gp_li_date_c || "—"}</span>
      ),
    },
     {
      label: "Link Expiry Date",
      accessor: "expiry_date_c",
      icon: Calendar,
      render: (row) => (
        <span className="font-medium text-slate-700">{row.expiry_date_c || "—"}</span>
      ),
    },
    {
      label: "Client Email",
      accessor: "client_email",
      icon: FileText,
      searchable: true,
      classes: "truncate max-w-[240px]",
      render: (row) => (
        <span className="font-semibold text-slate-800" title={row.client_email}>
          {row.client_email || "—"}
        </span>
      ),
    },
    {
      label: "Anchor Text",
      accessor: "anchor_text_c",
      icon: Tag,
      searchable: true,
      classes: "truncate max-w-[280px]",
      render: (row) => (
        <span className="font-medium text-slate-700" title={row.anchor_text_c}>
          {row.anchor_text_c || "—"}
        </span>
      ),
    },
    {
      label: "Source URL",
      accessor: "source_url_c",
      icon: Link2,
      searchable: true,
      classes: "truncate max-w-[360px]",
      render: (row) =>
        row.source_url_c ? (
          <a
            href={row.source_url_c}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            title={row.source_url_c}
            className="inline-flex max-w-full items-center gap-1.5 font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            <span className="truncate">{row.source_url_c}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
   
  ];
 
  return (
    <TableView
      tableData={backlinks}
      tableName={title}
      columns={columns}
      slice="backlinks"
      statusList={[]}
      statusCount={Number(firstPage.total ?? backlinks.length)}
      pageIndex={lastPage.page ?? 1}
      pageCount={firstPage.total_pages ?? 0}
      count={firstPage.total ?? 0}
      loading={isPending || isFetchingNextPage}
      preferences={preferences}
      refreshKey={["backlinks"]}
      fetchNextPage={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
    >
      <TableTitleBar Icon={Link2} title={title} titleClass="text-teal-700" />
      <Table
        headerStyle="bg-teal-600"
        layoutStyle="grid grid-cols-5"
        onRowClick={onRecordClick ? openRecord : undefined}
      />
    </TableView>
  );
}
