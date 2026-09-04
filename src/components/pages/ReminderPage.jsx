import {
  Calendar,
  User2,
  Globe,
  BadgeDollarSign,
  Clapperboard,
  BellIcon,
  Send,
  StopCircle,
  Ban,
  CircleX,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useContext, useEffect } from "react";
import { PageContext } from "../../context/pageContext.jsx";
import { excludeName, extractEmail } from "../../assets/assets.js";
import TableView, { Table } from "../ui/table/Table.jsx";
import TableTitleBar from "../ui/table/TableTitleBar.jsx";
import { LoadingChase } from "../Loading.jsx"
import { cancelReminder, orderRemAction, sendReminder } from "../../store/Slices/reminder.js";
import { toast } from "react-toastify";
import { reminderKeys, useInfiniteReminders, useReminderStats } from "../../queries/reminder.queries.js";
import { useTablePreference } from "../../hooks/useTablePreference.js";
import { queryClient } from "../../lib/queryClient.js";
import { useLocation } from "react-router-dom";
const STATUS_CONFIG = [
  {
    value: "Sent",
    label: "Sent",
    icon: Send,
    color: "#056439", // orange (amber-500)
    filter: "status",
  },
  {
    value: "Pending",
    label: "Pending",
    icon: StopCircle,
    color: "#d8ef44", // red (red-500)
    filter: "status",

  },
  {
    value: "cancel",
    label: "Cancelled",
    icon: Ban,
    color: "#EF4444", // red (red-500)
    filter: "status",

  }
];

function getLeftTime(scheduledTime) {
  if (!scheduledTime) return "N/A";

  // Parse "MM/DD/YYYY HH:mm" format
  const [datePart, timePart] = scheduledTime.replace(/\\/g, "").split(" ");
  const [month, day, year] = datePart.split("/");
  const scheduled = new Date(`${year}-${month}-${day}T${timePart}:00`);
  const now = new Date();
  const diffMs = scheduled - now;

  if (diffMs <= 0) return "Overdue";

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h left`;
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m left`;
  return `${diffMins}m left`;
}

export function ReminderPage() {
  const { sending, sendReminderId, message, error } = useSelector(
    (state) => state.reminders
  );
  const { enteredEmail: email } = useContext(PageContext)
  const preferences = useTablePreference("reminders");
  const location = useLocation();

  const effectivePreferences =
    location.state?.reminderFilter === "today-payment"
      ? {
        ...preferences,
        date_filter: {
          date_range: "today",
          date_field: "scheduled_time",
          date_from: "",
          date_to: "",
        },
        filters: {
          ...preferences.filters,
          ui_name: "payment",
          status: "Pending",
        },
      }
      : preferences;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useInfiniteReminders({ preferences: effectivePreferences, email });
  const { data: summary } = useReminderStats({ email, filters: effectivePreferences });
  const { handleDateClick, enteredEmail } =
    useContext(PageContext);
  const dispatch = useDispatch();
  const reminders =
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
      sortable: true,
      headerClasses: "",
      icon: Calendar,

      onClick: (row) => handleDateClick({ email: row?.recipient, navigate: "/" }),
      classes: "truncate max-w-[200px]",
      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row.date_entered_time_ago}
        </span>
      )
    },
    {
      label: "Contact",
      accessor: "recipient",
      headerClasses: "",
      searchable: true,

      icon: User2,
      classes: "truncate max-w-[200px]",
      onClick: (row) => handleDateClick({ email: row?.recipient, navigate: "/contacts" }),

      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {excludeName(row?.recipient)}
        </span>
      )
    },
    {
      label: "Type",
      accessor: "reminder_type",
      headerClasses: "",
      icon: Globe,
      classes: "truncate ",
      render: (row) => (
        <span className="font-medium text-lime-700 ">
          {row.reminder_type_label ||
            row.reminder_type ||
            "N/A"}        </span>
      )
    },

    {
      label: "STATUS",
      accessor: "status",
      headerClasses: "",
      icon: BadgeDollarSign,
      classes: "truncate max-w-[300px]",

      render: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${row?.status?.toLowerCase() === "pending"
            ? "bg-yellow-100 text-yellow-800"
            : row?.status?.toLowerCase() === "sent"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
            }`}
        >
          {row?.status}
        </span>
      )
    },
    {
      label: "Left Time",
      accessor: "remaining_time",
      headerClasses: "",
      icon: BadgeDollarSign,
      classes: "truncate max-w-[300px] ",

      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {getLeftTime(row.scheduled_time)}
        </span>
      )
    },

    {
      label: "Action",
      accessor: "action",
      headerClasses: "ml-auto",
      icon: Clapperboard,
      classes: "truncate max-w-[300px] ml-auto",
      render: (row) => {
        const valid = row?.status?.toLowerCase() === "sent" || row?.status?.toLowerCase() === "cancel"
        return <div className="flex items-center justify-center gap-2">
          {sending && sendReminderId === row.id ? (
            <LoadingChase size="20" color="blue" />
          ) : (
            <>
              <button
                className={`px-3 py-1  text-white rounded-lg hover:scale-110 transition-colors text-sm 
                            ${valid ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => { dispatch(sendReminder(row.id)) }}
                disabled={valid}
              >
                <img
                  width="34"
                  height="34"
                  src="https://img.icons8.com/arcade/64/send.png"
                  alt="send"
                />
              </button>
              <button
                className={`px-3 py-1   rounded-lg hover:scale-110 transition-colors text-sm ${valid ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                disabled={valid}
                onClick={() => { dispatch(cancelReminder({ email: row?.recipient, reminderId: row.id })) }}

              >
                <CircleX color="red" />
              </button>
            </>

          )}
        </div>
      }
    },


  ]
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

  useEffect(() => {
    if (message) {
      queryClient.invalidateQueries({ queryKey: reminderKeys.all })
      toast.success(message)
      dispatch(orderRemAction.clearAllMessage())

    }
    if (error) {
      toast.error(error)
      dispatch(orderRemAction.clearAllErrors())
    }
  }, [message, error]);
  return (
    <div className="relative">
      <TableView
        tableData={reminders}
        tableName={"Reminders"}
        columns={columns}
        slice={"reminders"}
        preferences={effectivePreferences}
        statusCount={statusCount}
        statusList={statusList}
        pageIndex={pageIndex}
        pageCount={pageCount}
        count={count}
        loading={loading}
        refreshKey={[
          "reminders",
        ]}
        fetchNextPage={() => {
          if (
            hasNextPage &&
            !isFetchingNextPage
          ) {
            fetchNextPage();
          }
        }}      >
        <TableTitleBar Icon={BellIcon} title={"Reminders"} titleClass={"text-lime-700"} />

        <Table
          headerStyle={"bg-lime-600"}
          layoutStyle={"grid grid-cols-6"}
          rowClassName={(row) =>
            row.id === sendReminderId ? "bg-lime-200 hover:bg-lime-200" : ""
          }
        />
      </TableView>
    </div>
  );
}