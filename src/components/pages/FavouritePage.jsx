import {
  Calendar,
  FileText,
  User,
  Heart,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useThreadContext } from "../../hooks/useThreadContext";
import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import { useContext } from "react";
import { PageContext } from "../../context/pageContext";
import { useTablePreference } from "../../hooks/useTablePreference";
import { useInfiniteFavorite } from "../../queries/favourite.queries";
export function FavouritePage() {
  const preferences =
    useTablePreference(
      "favorite"
    );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } =
    useInfiniteFavorite(
      preferences
    );;
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
      label: "Contact",
      accessor: "first_name",
      headerClasses: "",
      icon: User,
      classes: "truncate ",
      searchable: true,

      onClick: (row) => handleDateClick({ email: row?.email1, navigate: "/contacts" })
      ,

      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row?.first_name} {row?.last_name}        </span>
      )
    },
    {
      label: "Subject",
      accessor: "subject",
      headerClasses: "",
      searchable: true,

      icon: FileText,
      classes: "truncate max-w-[300px]",
      onClick: (row) => handleMove({
        email: row?.email1,
        threadId: row.thread_id,
      }),
      render: (row) => (
        <span className="px-6 py-4 text-green-600 cursor-pointer">
          {row.subject}
        </span>
      )
    },
    {
      label: "Description",
      accessor: "description",
      headerClasses: "",
      searchable: true,

      icon: FileText,
      classes: "truncate max-w-[300px]",
      render: (row) => (
        <span className="px-6 py-4 text-green-600 cursor-pointer">
          {row.description}
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
          "Favorite Emails"
        }
        columns={columns}
        slice={"favorite"}
        pageIndex={pageIndex}
        pageCount={pageCount}
        count={count}
        loading={loading}
        preferences={
          preferences
        }
        refreshKey={["favorite"]}
        fetchNextPage={() => {
          if (
            hasNextPage &&
            !isFetchingNextPage
          ) {
            fetchNextPage();
          }
        }}
      >        <TableTitleBar Icon={Heart} title={"Favorite Emails"} titleClass={"text-pink-700"} />
        <Table headerStyle={"  bg-pink-600"} body layoutStyle={"grid grid-cols-[200px_200px_1fr_1fr]"} />
      </TableView></>

  );
}