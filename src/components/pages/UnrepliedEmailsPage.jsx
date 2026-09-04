import { useDispatch, useSelector } from "react-redux";
import { useContext, useState } from "react";
import { PageContext } from "../../context/pageContext";
import { useThreadContext } from "../../hooks/useThreadContext";
import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import {
  Calendar,
  FileText,
  Mail,
  User,
  BarChart4,
  Gift,
  BadgeCheck,
  ChartBar,
  Handshake,
  ShoppingCart,
  MessageCircleReply,
  Mails,
} from "lucide-react";
import { GiGoldBar } from "react-icons/gi";
import { MdOutlineWorkspacePremium } from "react-icons/md";
import { FaBtc } from "react-icons/fa";
import { IoIosMailUnread } from "react-icons/io";
import { useTablePreference } from "../../hooks/useTablePreference.js";
import { useEmailStats, useInfiniteEmails, useUnreadCount } from "../../queries/email.queries.js";
import he from "he";
const STATUS_CONFIG = [
  {
    value: "unread",
    label: "Unread",
    icon: IoIosMailUnread,
    color: "#dc2626", // red
    emailType: "email_unread",
  },
  {
    value: "inbound",
    label: "Unreplied",
    icon: Mails,
    color: "#2563eb", // blue
    filter: 'direction',
    neqFilter: {
      conversation_complete: '1'
    }
  },
  {
    value: "outbound",
    label: "Replied",
    icon: MessageCircleReply,
    color: "#16a34a", // green
    emailType: "email_outbound",
    filter: 'direction',

  },

  {
    value: "offer",
    label: "Offer",
    icon: Gift,
    color: "#1a931c", // red
    emailType: "email_offer",
    filter: 'stage'
  },
  {
    value: "deal",
    label: "Deal",
    icon: Handshake,
    color: "#ca8a04", // yellow
    emailType: "email_deal",
    filter: 'stage'
  },
  {
    value: "order",
    label: "Order",
    icon: ShoppingCart,
    color: "#7c3aed", // purple
    emailType: "email_order",
    filter: 'stage'
  },
  {
    value: "Brand",
    label: "Brand",
    icon: FaBtc,
    color: "#ed3ab7", // purple
    emailType: "email_brand",
    filter: 'type'
  },
  {
    value: "verified",
    label: "Verified",
    icon: BadgeCheck,
    color: "#56cd1f", // purple
    emailType: "email_verified",
    filter: 'customer_type'
  },
  {
    value: "1",
    key: "completed",
    label: "Completed",
    icon: MdOutlineWorkspacePremium,
    color: "#56cd1f", // purple
    emailType: "email_completed",
    filter: 'conversation_complete'
  },
  {
    value: "1",
    key: "stop",
    label: "Stop",
    icon: GiGoldBar,
    color: "#ab9e11", // purple
    emailType: "email_stop",
    filter: 'is_stop'

  },
];
export function UnrepliedEmailsPage() {
  const preferences = useTablePreference("emails");
  const { data: unreadCount, isPending: unreadLoading } = useUnreadCount()
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteEmails(preferences)

  const { data: summary } = useEmailStats();
  const { handleMove } = useThreadContext();
  const { handleDateClick } = useContext(PageContext);
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
  const columns = [
    {
      label: "Created At",
      accessor: "date_modified",
      headerClasses: "",
      sortable: true,

      icon: Calendar,
      onClick: (row, index) =>
        handleDateClick({ email: row?.email1, navigate: "/", index, nextPrev: true }),
      classes: "truncate max-w-[200px]",
      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {unread ? row?.date_entered : row.date_modified_time_ago}
        </span>
      ),
    },

    {
      label: "Contact",
      accessor: "first_name",
      headerClasses: "",
      icon: User,
      searchable: true,
      classes: "truncate ",
      onClick: (row, index) =>
        handleDateClick({ email: row?.email1, navigate: "/contacts", index, nextPrev: true }),

      render: (row) => (
        <div className="flex items-center gap-2 cursor-pointer">
          <span className="font-medium text-gray-800">
            {he.decode(`${row?.first_name || ""} ${row?.last_name || ""}`)}          </span>

          {row.type === "Brand" && (
            <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
              Brand
            </span>
          )}
        </div>
      ),
    },
    {
      label: "Subject",
      accessor: "subject",
      headerClasses: "",
      icon: FileText,
      searchable: true,

      classes: "truncate max-w-[300px]",
      onClick: (row) =>
        handleMove({
          email: row?.email1,
          threadId: row.thread_id,
        }),
      render: (row) => (
        <span className="px-6 py-4 text-green-600 cursor-pointer">
          {he.decode(row?.subject ?? "")}
        </span>
      ),
    },
    {
      label: "Stage",
      accessor: "stage",
      headerClasses: "",
      icon: BarChart4,
      classes: "truncate max-w-[300px]",

      render: (row) => (
        <div className="flex items-center">
          <span
            className={`px-3 py-1.5 rounded-full text-sm border flex items-center `}
          >
            {row.stage}
          </span>
        </div>
      ),
    },
    {
      label: "Count",
      accessor: "thread_count",
      headerClasses: "",
      icon: ChartBar,
      classes: "truncate max-w-[300px]",

      render: (row) => (
        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
          {row?.thread_count}
        </span>
      ),
    },
  ];
  const filterColumns = [
    {
      label: "Type",
      accessor: "type",

      values: [
        {
          label: "Brand",
          value: "Brand",
        },

        {
          label: "Non-Brand",
          value: "Non-Brand",
        },
      ],
    },

    {
      label: "Stage",
      accessor: "stage",

      values: [
        {
          label: "Order",
          value: "order",
        },

        {
          label: "Offer",
          value: "offer",
        },

        {
          label: "Invoice",
          value: "invoice",
        },

        {
          label: "Deal",
          value: "deal",
        },
      ],
    },
  ];
  const statusList = STATUS_CONFIG.map((config) => {
    return {
      ...config,
      count: config.value == 'unread' ? (unreadLoading ? 0 : Number(unreadCount)) : Number(summary?.stats?.[`${config?.key ?? config?.value}`]?.count || 0),
    };
  });
  const statusCount = Object.values(summary?.stats ?? {}).reduce((acc, curr) => acc + curr?.count, 0)
  const unread = preferences.filters?.status == 'unread'

  return (
    <>
      <TableView
        tableData={emails}
        tableName={"Unreplied"}
        columns={columns}
        filterColumns={!unread && filterColumns}
        searching={!unread}
        sortingFilter={!unread}
        timefilter={!unread}
        timefilterField="date_modified"
        slice={"emails"}
        statusList={statusList}
        statusCount={statusCount}
        pageIndex={pageIndex}
        pageCount={pageCount}
        count={count}
        loading={loading}
        preferences={preferences}
        refreshKey={["emails"]}
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
          Icon={Mail}
          title={" Emails"}
        />

        {/* 🔥 TABLE WRAPPER */}
        <div className="relative">
          <Table
            headerStyle={"bg-rose-600"}
            layoutStyle={"grid grid-cols-[200px_1fr_1fr_200px_200px]"}
            rowClassName={(row) =>
              row.type === "Brand" ? "bg-orange-50 hover:bg-orange-100" : ""
            }
          />
        </div>
      </TableView>
    </>
  );
}