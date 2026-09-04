import {
  Calendar,
  FileText,
  User,
  MoveRight,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useContext, useState } from "react";
import { PageContext } from "../../context/pageContext";
import { useThreadContext } from "../../hooks/useThreadContext";
import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import { useTablePreference } from "../../hooks/useTablePreference.js";
import { useInfiniteForwarded } from "../../queries/forwarded.queries.js";

export function ForwardedPage() {
  const preferences =
    useTablePreference(
      "forwarded"
    );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } =
    useInfiniteForwarded(
      preferences
    );
  const { handleMove } = useThreadContext()
  const { handleDateClick } =
    useContext(PageContext);
  const dispatch = useDispatch();
  const columns = [
    {
      label: "Created At",
      accessor: "date_entered",
      headerClasses: "",
      icon: Calendar,
      sortable:true,

      onClick: (row) => handleDateClick({ email: row?.email1, navigate: "/" })
      ,
      classes: "truncate max-w-[200px]",
      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row.date_entered_time_ago}
        </span>
      )
    },
    {
      label: "Assigned At",
      accessor: "date_modified",
      headerClasses: "",
      icon: Calendar,

      onClick: (row) => handleDateClick({ email: row?.email1, navigate: "/" })
      ,
      classes: "truncate max-w-[200px]",
      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row.date_modified_time_ago}
        </span>
      )
    },

    {
      label: "Contact",
      accessor: "first_name",
      headerClasses: "",
      icon: User,
      classes: "truncate ",
      searchable: true,
      onClick: (row) => handleDateClick({ email: row?.email1, navigate: "/contacts" }),
      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row?.first_name} {row?.last_name}        </span>)
    },
    {
      label: "Subject",
      accessor: "subject",
      headerClasses: "",
      icon: FileText,
      searchable: true,

      classes: "truncate max-w-[300px]",
      onClick: (row) => handleMove({
        email: row.email_address,
        threadId: row.thread_id,
      }),
      render: (row) => (
        <span className="px-6 py-4 text-green-600 cursor-pointer">
          {row.subject}
        </span>
      )
    },
  ]
  const emails =
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

  return (
    <>

      <TableView
        tableData={emails}
        tableName={
          "Assign Emails"
        }
        columns={columns}
        slice={"forwarded"}
        pageIndex={pageIndex}
        pageCount={pageCount}
        count={count}
        loading={loading}
        preferences={
          preferences
        }

        refreshKey={[
          "forwarded",
        ]}
        fetchNextPage={() => {
          if (
            hasNextPage &&
            !isFetchingNextPage
          ) {
            fetchNextPage();
          }
        }}
      >        <TableTitleBar Icon={MoveRight} title={"Assign Emails"} titleClass={"text-sky-700"} />
        <Table headerStyle={"  bg-sky-600"} body layoutStyle={"grid grid-cols-[200px_200px_1fr_1fr]"} />
      </TableView></>

  );
}