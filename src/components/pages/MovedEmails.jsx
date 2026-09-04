import {
  Calendar,
  User2,
  Globe,
  BadgeDollarSign,
  ChartNoAxesColumn,
  Clapperboard,
  ArrowBigRightDashIcon,
} from "lucide-react";

import { useDispatch, useSelector } from "react-redux";
import { useContext, useEffect, useState } from "react";
import { PageContext } from "../../context/pageContext";
import { useThreadContext } from "../../hooks/useThreadContext";

import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import { useTablePreference } from "../../hooks/useTablePreference";
import { useInfiniteMovedEmails, useRestoreEmail } from "../../queries/movedEmail.queries";

export function MovedPage() {
  const preferences = useTablePreference("moved-emails");
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteMovedEmails(preferences);
  const { mutate, isPending: restoring, variables } = useRestoreEmail()


  const { handleDateClick } = useContext(PageContext);

  const { handleMove } = useThreadContext();
  const columns = [
    {
      label: "Created At",
      accessor: "date_entered",
      icon: Calendar,

      onClick: (row) =>
        handleDateClick({
          email: row?.email,
          navigate: "/",
        }),

      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row?.date_entered_time_ago}
        </span>
      ),
    },

    {
      label: "Sender",
      accessor: "email",
      icon: User2,
      classes: "truncate max-w-[200px]",
      searchable: true,

      render: (row) => (
        <span className="font-medium text-gray-700">{row?.email}</span>
      ),
    },

    {
      label: "Subject",
      accessor: "subject",
      icon: Globe,
      classes: "truncate max-w-[200px]",
      searchable: true,

      onClick: (row) =>
        handleMove({
          email: row?.email,
          threadId: row?.thread_id,
        }),

      render: (row) => (
        <span className="font-medium text-purple-700 cursor-pointer ">
          {row?.subject}
        </span>
      ),
    },

    {
      label: "Label",
      accessor: "label_name",
      icon: BadgeDollarSign,
      searchable: true,

      render: (row) => (
        <span className="font-medium text-green-700 ">{row?.label_name}</span>
      ),
    },

    {
      label: "Reason",
      accessor: "reason",
      icon: ChartNoAxesColumn,
      classes: "truncate max-w-[200px]",
      searchable: true,

      render: (row) => (
        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm truncate max-w-[200px]">
          {row?.reason || "Moved"}
        </span>
      ),
    },

    {
      label: "Action",
      accessor: "action",
      icon: Clapperboard,

      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            mutate(row)
          }}
          disabled={variables?.id == row.id}
          className="px-3 py-1 rounded-lg bg-green-500 text-white text-sm hover:bg-green-600 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer ml-auto"
        >
          {restoring && variables?.id == row.id ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin "></span>
              Restoring...
            </>
          ) : (
            "Restore"
          )}
        </button>
      ),
    },
  ];
  const emails =
    data?.pages?.flatMap(
      (page) => page.records || page.data || []
    ) ?? [];
  const pages = data?.pages ?? [];

  const lastPage = pages[pages.length - 1] ?? {};
  const firstPage = pages[0] ?? {};

  const pageIndex = lastPage.page ?? 1;
  const pageCount = firstPage.total_pages ?? 0;
  const count = firstPage.total ?? 0;

  const loading = isPending || isFetchingNextPage;
  return (
    <TableView
      tableData={emails}
      tableName={"Moved Emails"}
      columns={columns}
      slice={"moved-emails"}
      pageCount={pageCount}
      preferences={preferences}
      pageIndex={pageIndex}
      count={count}
      loading={loading}
      fetchNextPage={() => {
        if (
          hasNextPage &&
          !isFetchingNextPage
        ) {
          fetchNextPage();
        }
      }}    >
      <TableTitleBar
        Icon={ArrowBigRightDashIcon}
        title={"Moved Emails"}
        titleClass={"text-blue-700"}
      />

      <Table
        headerStyle={"bg-blue-600"}
        layoutStyle={"grid grid-cols-6"}
      />
    </TableView>
  );
}
