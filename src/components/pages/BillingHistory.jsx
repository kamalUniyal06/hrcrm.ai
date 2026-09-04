import {
    Calendar,
    FileText,
    User,
    MoveRight,
    Flame,
    Wallet,
    DollarSign,
    Waypoints,
    ChartArea,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useContext, useEffect, useState } from "react";
import { PageContext } from "../../context/pageContext";
import { useThreadContext } from "../../hooks/useThreadContext";
import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import { useTablePreference } from "../../hooks/useTablePreference.js";
import { useInfiniteHotEvents } from "../../queries/hot.queries.js";
import { useBillingHistory } from "../../queries/billings.queries.js";

export function BillingHistory() {
    const preferences =
        useTablePreference(
            "billingHistory"
        );

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isPending,
    } =
        useBillingHistory(
            preferences
        );

    const history =
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

    const columns = [
        {
            label: "Created At",
            accessor: "date_entered",
            headerClasses: "",
            icon: Calendar,

            classes: "truncate max-w-[200px]",
            render: (row) => (
                <span className="font-medium text-gray-700 cursor-pointer">
                    {row.date_entered_time_ago}
                </span>
            )
        },

        {
            label: "Customer Name",
            accessor: "customer_name",
            headerClasses: "",
            icon: User,
            searchable: true,

            render: (row) => (
                <span className="font-medium text-gray-700 cursor-pointer">
                    {row?.customer_name}      </span>
            )
        },
        {
            label: "Amount",
            accessor: "amount",
            headerClasses: "",
            icon: DollarSign,
            classes: "truncate ",
            searchable: true,

            render: (row) => (
                <span className="font-medium text-gray-700 cursor-pointer">
                    ${row?.amount}      </span>
            )
        },
        {
            label: "provider",
            accessor: "payment_provider",
            headerClasses: "",
            searchable: true,

            icon: Waypoints,
            classes: "",
            onClick: (row) => handleMove({
                email: row.email_address,
                threadId: row.thread_id,
            }),
            render: (row) => (
                <span className="px-6 py-4 text-green-600 cursor-pointer">
                    {row.payment_provider}
                </span>
            )
        },
        {
            label: "status",
            accessor: "payment_status",
            headerClasses: "",
            icon: ChartArea,
            classes: "",
            onClick: (row) => handleMove({
                email: row.email_address,
                threadId: row.thread_id,
            }),
            render: (row) => (
                <span className="px-6 py-4 text-purple-600 cursor-pointer">
                    {row.payment_status}
                </span>
            )
        },
    ]


    return (
        <TableView
            tableData={history}
            tableName={"Billing History"}
            columns={columns}
            slice={"billing"}
            pageIndex={pageIndex}
            pageCount={pageCount}
            count={count}
            loading={loading}
            preferences={preferences}
            refreshKey={["billing"]}
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
                Icon={Wallet}
                title={"Billing History"}
                titleClass={
                    "text-black-700"
                }
            />

            <Table
                headerStyle={
                    "bg-gray-600"
                }
                layoutStyle={
                    "grid grid-cols-5"
                }
            />
        </TableView>

    );
}