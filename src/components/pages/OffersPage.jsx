import {
  Calendar,
  User2,
  Gift,
  Globe,
  BadgeDollarSign,
  ChartNoAxesColumn,
  Clapperboard,
  Trash,
  ShieldCheckIcon,
  HandCoins,
  ShieldAlert,
  Eye,
} from "lucide-react";

import { useContext } from "react";
import { PageContext } from "../../context/pageContext";
import { useNavigate } from "react-router-dom";

import TableView, {
  Table,
} from "../ui/table/Table";

import TableTitleBar from "../ui/table/TableTitleBar";

import { LoadingChase } from "../Loading.jsx";

import { useTablePreference } from "../../hooks/useTablePreference";

import {
  useInfiniteOffers,
  useOfferStats,
  useDeleteOffer,
} from "../../queries/offers.queries";
import { useDispatch, useSelector } from "react-redux";
import { deleteOffer } from "../../store/Slices/offers.js";

const STATUS_CONFIG = [
  {
    value: "active",
    label: "Active",
    icon: ShieldCheckIcon,
    color: "#F59E0B",
    filter: "offer_status",
  },
  {
    value: "accepted",
    label: "Accepted",
    icon: HandCoins,
    color: "#10B981",
    filter: "offer_status",
  },
  {
    value: "expired",
    label: "Expired",
    icon: ShieldAlert,
    color: "#EF4444",
    filter: "offer_status",
  },
];

export function OffersPage() {
  const dispatch = useDispatch()
  const { deleting, deleteOfferId } = useSelector(s => s.offers)
  const preferences =
    useTablePreference(
      "offers"
    );
  const { enteredEmail: email } = useContext(PageContext)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteOffers({ preferences, email });

  const {
    data: summary,
  } = useOfferStats({ email });

  // const {
  //   mutate: deleteOffer,
  //   isPending: deleting,
  //   variables:
  //   deleteOfferId,
  // } = useDeleteOffer();

  const {
    handleDateClick,
  } = useContext(
    PageContext
  );

  const navigateTo =
    useNavigate();

  const offers =
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
      accessor:
        "date_entered",
      icon: Calendar,
      sortable: true,

      onClick: (row) =>
        handleDateClick({
          email:
            row?.name,
          navigate: "/",
        }),

      classes:
        "truncate max-w-[200px]",

      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {
            row.date_entered_time_ago
          }
        </span>
      ),
    },

    {
      label: "Contact",
      accessor: "first_name",
      icon: User2,
      searchable: true,

      classes:
        "truncate max-w-[200px]",

      onClick: (row) =>
        handleDateClick({
          email:
            row?.name,
          navigate:
            "/contacts",
        }),

      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {
            row?.first_name
          }{" "}
          {
            row?.last_name
          }
        </span>
      ),
    },

    {
      label: "Website",
      accessor:
        "website",
      icon: Globe,
      classes: "truncate max-w-[300px]",
      searchable: true,

      render: (row) => (
        <span className="font-medium text-blue-700 truncate min-w-[100px]">
          {
            row?.website
          }
        </span>
      ),
    },

    {
      label:
        "Client Offer",
      accessor:
        "client_offer_c",
      sortable: true,
      icon:
        BadgeDollarSign,
      classes: "text-center",
      searchable: true,

      render: (row) => (
        <span className="font-medium text-green-700 ">
          ${
            row?.client_offer_c
          }
        </span>
      ),
    },

    {
      label:
        "Our Offer",
      accessor:
        "our_offer_c",
      sortable: true,
      icon:
        BadgeDollarSign,
      classes: "text-center",
      searchable: true,

      render: (row) => (
        <span className="font-medium text-gray-700">
          ${
            row?.our_offer_c
          }
        </span>
      ),
    },

    {
      label: "Status",
      accessor:
        "offer_status",
      icon:
        ChartNoAxesColumn,

      render: (row) => (
        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
          {
            row?.offer_status
          }
        </span>
      ),
    },


    {
      label: "Action",
      accessor:
        "action",
      icon:
        Clapperboard,

      headerClasses:
        "ml-auto",

      classes:
        "truncate max-w-[300px] ml-auto",

      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
            title="View"
            onClick={() =>
              navigateTo(
                `/offers/view?email=${row?.name}&id=${row?.id}`)
            }
          >
            <Eye className="w-5 h-5 text-blue-600" />
          </button>

          {deleting &&
            deleteOfferId ===
            row.id ? (
            <LoadingChase
              size="20"
              color="red"
            />
          ) : (
            <button
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete"
              onClick={() => dispatch(deleteOffer(row.id, row))}
            >
              <Trash className="w-5 h-5 text-red-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const statusList =
    STATUS_CONFIG.map(
      (config) => ({
        ...config,

        count: Number(
          summary?.stats?.[
            config.value
          ]?.count || 0
        ),
      })
    );
  const statusCount = Object.values(summary?.stats ?? {}).reduce((acc, curr) => acc + curr?.count, 0)

  return (
    <TableView
      tableData={offers}
      tableName={
        "Offers"
      }
      columns={columns}
      slice={"offers"}
      statusList={
        statusList
      }
      statusCount={statusCount}
      pageIndex={
        pageIndex
      }
      pageCount={
        pageCount
      }
      count={count}
      loading={loading}
      preferences={
        preferences
      }
      refreshKey={[
        "offers",
      ]}
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
        Icon={Gift}
        title={"Offers"}
        titleClass={
          "text-green-700"
        }
      />

      <Table
        headerStyle={
          "bg-green-600"
        }
        layoutStyle={
          "grid grid-cols-8"
        }
      />
    </TableView>
  );
}