import {
  Calendar,
  FileText,
  User,
  MoveRight,
  Flame,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useContext, useEffect, useState } from "react";
import { PageContext } from "../../context/pageContext";
import { useThreadContext } from "../../hooks/useThreadContext";
import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import { useTablePreference } from "../../hooks/useTablePreference.js";
import { useInfiniteHotEvents } from "../../queries/hot.queries.js";

export function HotPage() {
  const preferences =
    useTablePreference(
      "hot"
    );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } =
    useInfiniteHotEvents(
      preferences
    );

  const hots =
    data?.pages?.flatMap(
      (page) =>
        page.records ||
        page.data ||
        []
    ) ?? [];

  const pages =
    data?.pages ?? [];

  const lastPage =
    pages[
    pages.length - 1
    ] ?? {};

  const firstPage =
    pages[0] ?? {};

  const pageIndex =
    lastPage.page ?? 1;

  const pageCount =
    firstPage.total_pages ??
    0;

  const count =
    firstPage.total ?? 0;

  const loading =
    isPending ||
    isFetchingNextPage;

  const { handleMove } = useThreadContext()
  const { handleDateClick } =
    useContext(PageContext);

  const columns = [
    {
      label: "Created At",
      accessor: "date_entered",
      headerClasses: "",
      icon: Calendar,

      onClick: (row) => handleDateClick({ email: row?.name, navigate: "/" })
      ,
      classes: "truncate max-w-[200px]",
      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row.date_entered_time_ago}
        </span>
      )
    },

    {
      label: "Contact",
      accessor: "name",
      headerClasses: "",
      icon: User,
      classes: "truncate ",
      onClick: (row) => handleDateClick({ email: row?.name, navigate: "/contacts" })
      ,
      searchable: true,

      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row?.name}      </span>
      )
    },
    {
      label: "Description",
      accessor: "description",
      headerClasses: "",
      searchable: true,

      icon: FileText,
      classes: "truncate max-w-[300px]",
      onClick: (row) => handleMove({
        email: row.email_address,
        threadId: row.thread_id,
      }),
      render: (row) => (
        <span className="px-6 py-4 text-green-600 cursor-pointer">
          {row.description}
        </span>
      )
    },
    {
      label: "Type",
      accessor: "type",
      headerClasses: "ml-auto",
      icon: FileText,
      classes: "truncate max-w-[300px] ml-auto",
      onClick: (row) => handleMove({
        email: row.email_address,
        threadId: row.thread_id,
      }),
      render: (row) => (
        <span className="px-6 py-4 text-purple-600 cursor-pointer">
          {row.type}
        </span>
      )
    },
  ]


  return (
    <TableView
      tableData={hots}
      tableName={"Hot Events"}
      columns={columns}
      slice={"hot"}
      pageIndex={pageIndex}
      pageCount={pageCount}
      count={count}
      loading={loading}
      preferences={preferences}
      refreshKey={["hot"]}
      fetchNextPage={() => {
        if (
          hasNextPage &&
          !isFetchingNextPage
        ) {
          fetchNextPage();
        }
      }}
    >
      <TableTitleBar
        Icon={Flame}
        title={"Hot Events"}
        titleClass={
          "text-orange-700"
        }
      />

      <Table
        headerStyle={
          "bg-orange-600"
        }
        layoutStyle={
          "grid grid-cols-4"
        }
      />
    </TableView>

  );
}