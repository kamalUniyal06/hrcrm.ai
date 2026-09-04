import {
    Calendar,
    User2,
    Globe,
    BadgeDollarSign,
    ChartNoAxesColumn,
    ContactRound,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useContext, useEffect, useState } from "react";
import { PageContext } from "../../context/pageContext";
import { useNavigate } from "react-router-dom";
import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import UpdatePopup from "../UpdatePopup";

import {
    ShieldCheckIcon,
    UserCheck,
    UserX,
    BadgeCheck,
    FileText,
    ShoppingCart,
    AlertTriangle
} from "lucide-react";
import { contactKeys, useContactStats, useCreateContact, useInfiniteContacts } from "../../queries/contact.queries.js";
import { useTablePreference } from "../../hooks/useTablePreference.js";
import { queryClient } from "../../lib/queryClient.js";
import he from "he";

const STATUS_CONFIG = [
    {
        value: "new",
        label: "New",
        icon: ShieldCheckIcon,
        color: "#3B82F6", // blue
        filter: 'stage'
    },
    {
        value: "unverified",
        label: "Unverified",
        icon: UserX,
        color: "#F59E0B", // amber
        filter: 'customer_type'


    },
    {
        value: "verified",
        label: "Verified",
        icon: UserCheck,
        color: "#10B981", // green
        filter: 'customer_type'

    },
    {
        value: "deal",
        label: "Deal",
        icon: FileText,
        color: "#6366F1", // indigo
        filter: 'stage'

    },
    {
        value: "offer",
        label: "Offer",
        icon: BadgeCheck,
        color: "#8B5CF6", // violet
        filter: 'stage'

    },
    {
        value: "order",
        label: "Order",
        icon: ShoppingCart,
        color: "#22C55E", // green
        filter: 'stage'

    },
    {
        value: "defaulter",
        label: "Defaulter",
        icon: AlertTriangle,
        color: "#EF4444", // red
        filter: 'customer_type'

    }
];
export default function AllContacts() {
    const preferences = useTablePreference("contacts");
    const { handleDateClick } =
        useContext(PageContext);
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isPending,
    } = useInfiniteContacts(preferences);
    const {
        data: summary,
        isPending: summaryLoading,
    } = useContactStats();
    if (!isPending) {
        console.log("CONTACTS", data)
    }

    const { mutate, isPending: creating } =
        useCreateContact(handleDateClick);

    const contacts =
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
    const [open, setOpen] = useState(false)
    const columns = [
        {
            label: "Created At",
            accessor: "date_entered_time_ago",
            headerClasses: "",
            icon: Calendar,
            sortable: true,

            onClick: (row) => handleDateClick({ email: row?.email1 ?? `${row?.first_name} ${row?.last_name} `, navigate: "/" }),
            classes: "truncate max-w-[200px]",
            render: (row) => (
                <span className="font-medium text-gray-700 cursor-pointer">
                    {row?.date_entered_time_ago}
                </span>
            ),
        },
        {
            label: "Name",
            accessor: "first_name",
            headerClasses: "",
            searchable: true,
            icon: User2,
            classes: "truncate max-w-[200px]",
            onClick: (row) =>
                handleDateClick({ email: row?.email1 ?? `${row?.first_name} ${row?.last_name} `, navigate: "/contacts" }),

            render: (row) => (
                <span className="font-medium text-gray-700 cursor-pointer">
                    {he.decode(`${row?.first_name || ""} ${row?.last_name || ""}`)}
                </span>
            ),
        },
        {
            label: "Type",
            accessor: "type",
            headerClasses: "",
            icon: Globe,
            classes: "truncate ",
            render: (row) => (
                <span className="font-medium text-blue-700 ">   {row?.type}</span>
            ),
        },
        {
            label: "Stage",
            accessor: "stage",
            headerClasses: "",
            icon: BadgeDollarSign,
            classes: "truncate max-w-[300px]",

            render: (row) => (
                <span className="font-medium text-green-700 ">{row?.stage}</span>
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
            label: "Customer Type",
            accessor: "customer_type",
            headerClasses: "",
            icon: Calendar,
            classes: "truncate max-w-[300px]",

            render: (row) => (
                <span className="font-medium text-green-700 "> {row?.customer_type || ""}</span>
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
                {
                    label: "New",
                    value: "new",
                },
            ],
        },
        {
            label: "Customer Type",
            accessor: "customer_type",

            values: [
                {
                    label: "Unverified",
                    value: "unverified",
                },
                {
                    label: "Verified",
                    value: "verified",
                },

                {
                    label: "Defaulter",
                    value: "defaulter",
                },
            ],
        },
        {
            label: "Status",
            accessor: "status",

            values: [
                {
                    label: "Unreplied",
                    value: "unreplied",
                },
                {
                    label: "Replied",
                    value: "replied",
                },



            ],
        },
    ];
    const statusList = STATUS_CONFIG.map((config) => {
        return {
            ...config,
            count: Number(summary?.stats?.[`${config.value}`]?.count || 0),
        };
    });
    const statusCount = Object.values(summary?.stats ?? {}).reduce((acc, curr) => acc + curr?.count, 0)
    return (
        <>
            {open && <UpdatePopup
                open={open}
                loading={creating}
                onClose={() => setOpen(false)}
                title="Create Contact"
                fields={[
                    {
                        label: "Name",
                        name: "full_name",
                        type: "text",
                        value: "",
                        required: true,
                    },
                    {
                        label: "Email",
                        name: "email1",
                        type: "text",
                        value: "",
                        required: true
                    },
                    {
                        label: "Source",
                        name: "source",
                        type: "text",
                        value: "Direct Email",
                    },
                ]}
                onUpdate={(contact) => mutate(contact)}
                buttonLabel="Create"
            />}
            <TableView
                tableData={contacts}
                tableName={"Contacts"}
                preferences={preferences}
                columns={columns}
                slice={"contacts"}
                filterColumns={filterColumns}
                refreshKey={['contacts']}
                statusList={statusList}
                pageIndex={pageIndex}
                pageCount={pageCount}
                count={count}
                loading={loading}
                statusCount={statusCount}
                canAdd={true}
                handleAddClick={() => setOpen(true)}
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
                    Icon={ContactRound}
                    title={"Contacts"}
                    titleClass={"text-fuchsia-600"}
                />
                <Table
                    headerStyle={"  bg-fuchsia-600"}
                    layoutStyle={"grid grid-cols-[1fr_1fr_1fr_200px_200px_1fr]"}
                />
            </TableView >
        </>

    );
}
