import {
  Calendar,
  User2,
  Gift,
  ChartNoAxesColumn,
  CreditCard,
  Wallet,
} from "lucide-react";

import { useContext } from "react";
import { PageContext } from "../../context/pageContext";
import { useNavigate } from "react-router-dom";
import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import { useTablePreference } from "../../hooks/useTablePreference";
import { useCreditStats, useInfiniteCredits } from "../../queries/credits.queries.js";
export function AiCreditsPage() {
  const preferences =
    useTablePreference(
      "credits"
    );
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteCredits(preferences);

  const {
    data: summary,
  } = useCreditStats();



  const {
    handleDateClick,
  } = useContext(
    PageContext
  );

  const navigateTo =
    useNavigate();

  const credits =
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

  const columns = [
    {
      label: "Created At",
      accessor: "date_entered",
      icon: Calendar,
      onClick: (row) => handleDateClick({ email: row?.email, navigate: "/" }),

      classes: "truncate max-w-[200px]",

      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row?.date_entered_time_ago}
        </span>
      ),
    },

    {
      label: "Contact",
      accessor: "email",
      icon: User2,
      searchable: true,
      classes: "truncate max-w-[200px]",
      onClick: (row) => handleDateClick({ email: row?.email, navigate: "/contacts" }),
      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row?.email}
        </span>
      ),
    },
    {
      label: "Credit",
      accessor: "credit",
      icon: CreditCard,
      searchable: true,
      classes: "truncate max-w-[100px]",
      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row?.credit}
        </span>
      ),
    },
    {
      label: "Debit",
      accessor: "debit",
      icon: Wallet,
      searchable: true,
      classes: "truncate max-w-[100px]",
      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row?.debit}
        </span>
      ),
    },


    {
      label: "Balance",
      accessor: "balance",
      icon: ChartNoAxesColumn,
      searchable: true,

      render: (row) => (
        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
          {row?.balance}
        </span>
      ),
    },
  ];


  return (
    <TableView
      tableData={credits}
      tableName={"Ai Credits"}
      columns={columns}
      slice={"credits"}
      pageIndex={pageIndex}
      pageCount={pageCount}
      count={count}
      loading={loading}
      preferences={preferences}
      refreshKey={["credits"]}
      fetchNextPage={() => {
        if (
          hasNextPage &&
          !isFetchingNextPage
        ) {
          fetchNextPage();
        }
      }}
    >
      <TableTitleBar Icon={Gift} title={"AI Credits"} titleClass={"text-purple-700"} />
      <Table layoutStyle={"grid grid-cols-5"} />
    </TableView>
  );
}