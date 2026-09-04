import {
  Calendar,
  User2,
  Globe,
  BadgeDollarSign,
  ChartNoAxesColumn,
  Clapperboard,
  Trash,
  ShieldCheckIcon,
  ShieldAlert,
  Handshake,
  Eye,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useContext, useEffect } from "react";
import { dealsAction, deleteDeal } from "../../store/Slices/deals.js";
import { PageContext } from "../../context/pageContext";
import { useNavigate } from "react-router-dom";
import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import { LoadingChase } from "../Loading.jsx";
import { useTablePreference } from "../../hooks/useTablePreference.js";
import { useDealStats, useDeleteDeal, useInfiniteDeals } from "../../queries/deals.queries.js";
import toast from "react-hot-toast";
const STATUS_CONFIG = [
  {
    value: "active",
    label: "Active",
    icon: ShieldCheckIcon,
    color: "#F59E0B", // orange (amber-500)
    showAmount: true,
    filter: 'status'
  },
  {
    value: "expire",
    label: "Expire",
    icon: ShieldAlert,
    showAmount: true,

    color: "#EF4444", // red (red-500)
    filter: 'status'

  },
];
export function DealsPage() {
  const { deleting, deleteDealId, message, error } = useSelector(s => s.deals)
  const preferences =
    useTablePreference(
      "deals"
    );
  const { enteredEmail: email } = useContext(PageContext)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteDeals(
    { preferences, email }
  );

  const {
    data: summary,
  } = useDealStats({ email });
  useEffect(() => {
    if (message) {
      dispatch(dealsAction.clearAllMessages())
      toast.success(message)
    }
    if (error) {
      dispatch(dealsAction.clearAllErrors())
      toast.error(error)
    }

  }, [message, error])
  // const {
  //   mutate: deleteDeal,
  //   isPending: deleting,
  //   variables:
  //   deleteDealId,
  // } = useDeleteDeal();
  const { handleDateClick } =
    useContext(PageContext);
  const navigateTo = useNavigate();
  const dispatch = useDispatch();
  const columns = [
    {
      label: "Created At",
      accessor: "date_entered",
      sortable: true,
      headerClasses: "",
      icon: Calendar,

      onClick: (row) => handleDateClick({ email: row?.email, navigate: "/" }),
      classes: "truncate max-w-[200px]",
      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row.date_entered_time_ago}
        </span>
      ),
    },
    {
      label: "Contact",
      accessor: "first_name",
      headerClasses: "",
      icon: User2,
      classes: "truncate max-w-[200px]",
      onClick: (row) =>
        handleDateClick({ email: row?.email, navigate: "/contacts" }),

      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row?.first_name || ""} {row?.last_name || ""} {(!row?.first_name || !row?.last_name) ? row?.email : ""}
        </span>
      ),
    },
    {
      label: "Website",
      accessor: "website_c",
      searchable: true,

      headerClasses: "",
      icon: Globe,
      classes: "truncate ",
      render: (row) => (
        <span className="font-medium text-blue-700 ">{row?.website_c}</span>
      ),
    },
    {
      label: "Amount",
      accessor: "dealamount",
      searchable: true,
      sortable: true,

      headerClasses: "",
      icon: BadgeDollarSign,
      classes: "text-center",

      render: (row) => (
        <span className="font-medium text-green-700 ">${row?.dealamount}</span>
      ),
    },

    {
      label: "Status",
      accessor: "status",
      headerClasses: "",
      icon: ChartNoAxesColumn,
      classes: "truncate max-w-[300px]",

      render: (row) => (
        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
          {row?.status}
        </span>
      ),
    },
    {
      label: "Action",
      accessor: "action",
      headerClasses: "ml-auto",
      icon: Clapperboard,
      classes: "truncate max-w-[300px] ml-auto",
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          {/* Update Button */}
          <button
            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
            title="View"
            onClick={() =>
              navigateTo(`/deals/view?email=${row?.email}&id=${row?.id}`)
            }
          >
            <Eye className="w-5 h-5 text-blue-600" />
          </button>
          {/* Delete Button */}
          {deleting &&
            deleteDealId === row.id ? (
            <LoadingChase size="20" color="red" />
          ) : (
            <button
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete"
              onClick={() =>
                dispatch(deleteDeal(row, row.id))
              }
            >
              <Trash className="w-5 h-5 text-red-600" />
            </button>
          )}
        </div>
      ),
    },
  ];
  const deals =
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
  const statusList = STATUS_CONFIG.map((config) => {
    return {
      ...config,
      count: Number(summary?.stats?.[`${config.value}`]?.count || 0),
      amount: Number(summary?.stats?.[`${config.value}`]?.sum_of?.dealamount || 0),
    };
  });
  const statusCount = Object.values(summary?.stats ?? {}).reduce((acc, curr) => acc + curr?.count, 0)

  return (
    <TableView
      tableData={deals}
      tableName={"Deals"}
      columns={columns}
      slice={"deals"}
      statusList={statusList}
      pageIndex={pageIndex}
      statusCount={statusCount}
      pageCount={pageCount}
      count={count}
      loading={loading}
      preferences={preferences}
      refreshKey={["deals"]}
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
        Icon={Handshake}
        title={"Deals"}
        titleClass={"text-blue-700"}
      />
      <Table
        headerStyle={"  bg-blue-600"}
        layoutStyle={"grid grid-cols-7"}
      />
    </TableView>
  );
}
