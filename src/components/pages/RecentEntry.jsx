import {
  CalendarDays,
  Mail,
  Activity,
  SparkleIcon,
  UserCircle,
} from "lucide-react";

import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { PageContext } from "../../context/pageContext";
import { useThreadContext } from "../../hooks/useThreadContext";

import useModule from "../../hooks/useModule";

import { CREATE_DEAL_API_KEY } from "../../store/constants";


import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import { useTablePreference } from "../../hooks/useTablePreference";
import { useInfiniteRecentEvents } from "../../queries/recentAct.queries";
import { useContext, useState } from "react";
import PromptLadger from "../PromptLadger";

/* 🔹 Tooltip */
const Tooltip = ({ content, children }) => {
  if (!content) return children;

  return (
    <div className="relative group min-w-0">
      {children}

      <div className="absolute z-50 hidden group-hover:block bg-gray-900 text-white text-sm px-3 py-1 rounded-md shadow-lg -top-8 left-1/2 -translate-x-1/2">
        {content}
      </div>
    </div>
  );
};

export function RecentEntry() {
  const preferences = useTablePreference("recent");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteRecentEvents(preferences);

  const { crmEndpoint } = useSelector((state) => state.user);

  const { loading: grpLoading, data: grpData } = useModule({
    url: `${crmEndpoint.split("?")[0]
      }?entryPoint=get_post_all&action_type=get_data`,
    method: "POST",
    body: {
      module: "outr_ledger_manager",
    },
    headers: {
      "x-api-key": CREATE_DEAL_API_KEY,
      "Content-Type": "application/json",
    },
    name: `Activity Group`,
  });


  const { handleDateClick } = useContext(PageContext);

  const { handleMove } = useThreadContext();
  const [activePromptId, setActivePromptId] = useState()
  const navigateTo = useNavigate();




  const events =
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
      accessor: "date_entered",
      icon: CalendarDays,

      render: (event) => (
        <div
          className="flex items-center gap-3 min-w-0 cursor-pointer"
          onClick={() =>
            handleDateClick({
              email: event?.name,
              navigate: "/",
            })
          }
        >
          <span className="truncate">{event.date_entered_time_ago ?? "—"}</span>

          {event?.prompt_ledger_id && (
            <button
              onClick={(e) => {
                e.stopPropagation();

                setActivePromptId(event.prompt_ledger_id)
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              <SparkleIcon size={16} />
            </button>
          )}
        </div>
      ),
    },

    {
      label: "Contact",
      accessor: "name",
      searchable: true,

      render: (event) => {
        const contactName = event.name ?? "—";

        return (
          <Tooltip content={contactName}>
            <div
              className="text-blue-600 cursor-pointer truncate"
              onClick={() =>
                handleDateClick({
                  email: event.name,
                  navigate: "/contacts",
                })
              }
            >
              {contactName}
            </div>
          </Tooltip>
        );
      },
    },



    {
      label: "Recent Activity",
      accessor: "recent_activity",
      icon: Activity,
      searchable: true,

      render: (event) => (
        <Tooltip content={event.recent_activity}>
          <div className="truncate">{event.recent_activity ?? "—"}</div>
        </Tooltip>
      ),
    },

    {
      label: "User",
      accessor: "user",
      icon: UserCircle,
      searchable: true,

      render: (event) => (
        <div className="flex items-center gap-2">
          <UserCircle size={18} />

          {(event.user_details == false && "GPC") || event?.user_details?.name}
        </div>
      ),
    },
  ];
  const filterColumns = [
    {
      label: "Group",
      accessor: "grp",
      values:
        grpData?.map((grp) => ({
          value: grp.name,
          label: grp.description,
        })) || [],
    },
  ];
  return (
    <>
      <PromptLadger activePromptId={activePromptId} setActivePromptId={setActivePromptId} isModal={true} />
      <TableView
        tableData={events}
        tableName={"Recent Entries"}
        columns={columns}
        slice={"recent"}
        filterColumns={filterColumns}
        preferences={preferences}
        refreshKey={["recent"]}
        pageIndex={pageIndex}
        pageCount={pageCount}
        count={count}
        loading={loading}
        fetchNextPage={() => {
          if (
            hasNextPage &&
            !isFetchingNextPage
          ) {
            fetchNextPage();
          }
        }}
      >
        <TableTitleBar Icon={Activity} title={"Recent Entries"} titleClass={"text-green-600"} />
        <Table headerStyle={"bg-green-600"} layoutStyle={"grid grid-cols-4"} />
      </TableView>
    </>

  );
}
