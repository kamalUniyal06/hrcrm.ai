import {
  Calendar,
  Pen,
  Globe,
  BadgeDollarSign,
  ChartNoAxesColumn,
  Clapperboard,
  FileText,
  Link2Icon,
  Wallet,
  Banknote,
  Flag,
  SendHorizonal,
  DollarSign,
  NotepadTextDashed,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useContext, useEffect, useState } from "react";
import { PageContext } from "../../context/pageContext";
import { extractEmail } from "../../assets/assets";
import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import UpdatePopup from "../UpdatePopup.jsx"
import { useTablePreference } from "../../hooks/useTablePreference.js";

import { useInfiniteInvoices, useInvoiceStats, useUpdateInvoice } from "../../queries/invoice.queries.js";
import toast from "react-hot-toast";
const getPaymentMethodIcon = (method) => {
  switch (method?.toLowerCase()) {
    case "paypal":
      return <Wallet className="w-4 h-4 mr-1" />;
    case "payoneer":
      return <Globe className="w-4 h-4 mr-1" />;
    case "wise":
      return <Banknote className="w-4 h-4 mr-1" />;
    case "indian_upi":
      return <Flag className="w-4 h-4 mr-1" />;
    case "swift_india":
      return <Banknote className="w-4 h-4 mr-1" />;
    default:
      return <Wallet className="w-4 h-4 mr-1" />;
  }
};
const getPaymentMethodColor = (method) => {
  switch (method?.toLowerCase()) {
    case "paypal":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "payoneer":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "wise":
      return "bg-green-100 text-green-700 border-green-200";
    case "indian_upi":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "swift_india":
      return "bg-purple-100 text-purple-700 border-purple-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};
const STATUS_CONFIG = [
  {
    value: "SENT",
    label: "Sent",
    icon: SendHorizonal,
    color: "#2563eb", // orange (amber-500)
    filter: "status_c"
  },
  {
    value: "PAID",
    label: "Paid",
    icon: DollarSign,
    color: "#10B981", // green (emerald-500)
    filter: "status_c"

  },
  {
    value: "DRAFT",
    label: "Draft",
    icon: NotepadTextDashed,
    color: "#ca8a04",
    filter: "status_c"

  }
];
export function InvoicesPage() {
  const preferences = useTablePreference("invoices");
  const { enteredEmail: email } = useContext(PageContext)


  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } =
    useInfiniteInvoices(
      { preferences, email }
    );

  const {
    data: summary,
  } =
    useInvoiceStats({ email });

  const {
    mutate:
    updateInvoice,
    isPending:
    updating,
  } =
    useUpdateInvoice();
  const [currentUpdateInvoice, setCurrentUpdateInvoice] = useState(null);



  const { handleDateClick } =
    useContext(PageContext);
  const dispatch = useDispatch();

  const updateInvoiceHandler = (invoice, data) => {
    const updatedInvoice = {
      ...invoice,
      ...data,
    };
    updateInvoice(
      updatedInvoice,
      {
        onSuccess: () => {
          setCurrentUpdateInvoice(null);
          toast.success("Invoice Updated Successfully!")
        },
        onError: () => {
          toast.error("Failed To Update Invoice!")

        }
      }
    );
  };

  const columns = [
    {
      label: "Created At",
      accessor: "date_entered",
      headerClasses: "",
      icon: Calendar,

      onClick: (row) => handleDateClick({ email: extractEmail(row?.email_c), navigate: "/" }),
      classes: "truncate max-w-[200px]",
      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row.date_entered_time_ago}
        </span>
      )
    },
    {
      label: "LINK ",
      accessor: "preview",
      headerClasses: "",
      icon: Link2Icon,
      classes: "truncate max-w-[200px]",
      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          <a
            href={row.preview}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View Invoice
          </a>
        </span>
      )
    },
    {
      label: "CLIENT",
      accessor: "email_c",
      headerClasses: "",
      icon: Globe,
      classes: "truncate ",
      onClick: (row) => handleDateClick({ email: extractEmail(row?.email_c), navigate: "/contacts" }),
      searchable: true,

      render: (row) => (
        <span className="font-medium text-gray-700 cursor-pointer">
          {row?.email_c}
        </span>
      )
    },
    {
      label: "Amount",
      accessor: "amount_c",
      headerClasses: "",
      icon: BadgeDollarSign,
      classes: "truncate max-w-[300px]",
      searchable: true,

      render: (row) => (
        <span className="px-6 py-4 text-green-600">
          ${parseFloat(row.amount_c || 0).toFixed(2)}
        </span>
      )
    },
    {
      label: "Payment Method",
      accessor: "payment_method",
      headerClasses: "",
      icon: BadgeDollarSign,
      classes: "truncate max-w-[300px]",

      render: (row) => (
        <div className="flex items-center">
          <span
            className={`px-3 py-1.5 rounded-full text-sm border flex items-center ${getPaymentMethodColor(row.payment_method)}`}
          >
            {getPaymentMethodIcon(row.payment_method)}
            {row.payment_method
              ? row.payment_method
                .replace("_", " ")
                .toUpperCase()
              : "N/A"}
          </span>
        </div>
      )
    },
    {
      label: "Status",
      accessor: "status_c",
      headerClasses: "",
      icon: ChartNoAxesColumn,
      classes: "truncate max-w-[200px]",

      render: (row) => (
        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
          {row?.status_c}
        </span>
      )
    },
    {
      label: "Due Date",
      accessor: "due_date",
      headerClasses: "",
      icon: ChartNoAxesColumn,
      classes: "truncate max-w-[300px]",

      render: (row) => (
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
          {row?.due_date}
        </span>
      )
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
            onClick={() => setCurrentUpdateInvoice(row)}
            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
            title="Update"
          >
            <Pen className="w-4 h-4 text-blue-600" />
          </button>

        </div>
      )
    },


  ]
  const filterColumns = [
    {
      label: "Status",
      accessor: "status_c",
      values: [
        {
          label: "Sent",
          value: "SENT",
        },
        {
          label: "Paid",
          value: "PAID",
        },
        {
          label: "Draft",
          value: "DRAFT",
        },
      ],
    },

    {
      label:
        "Payment Method",

      accessor:
        "payment_method",

      values: [
        {
          value: "paypal",
          label: "PayPal",
        },
        {
          value:
            "payoneer",
          label:
            "Payoneer",
        },
        {
          value: "wise",
          label: "Wise",
        },
        {
          value:
            "indian_upi",
          label:
            "Indian UPI",
        },
        {
          value:
            "swift_india",
          label:
            "Swift India",
        },
      ],
    },
  ];
  const invoices =
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
  const statusList =
    STATUS_CONFIG.map(
      (config) => ({
        ...config,

        count: Number(
          summary?.stats?.[
            config.value
          ]?.count || 0
        ),
        showAmount: true,
        amount: Number(
          summary?.stats?.[
            config.value
          ]?.sum_of?.amount_c || 0
        ),

      })
    );
  const statusCount = Object.values(summary?.stats ?? {}).reduce((acc, curr) => acc + curr?.count, 0)

  return (
    <>
      {currentUpdateInvoice && (
        <UpdatePopup
          open={!!currentUpdateInvoice}
          title="Update Invoice"
          fields={[
            {
              name: "name",
              label: "Name",
              type: "text",
              value: currentUpdateInvoice.name,
            },
            {
              name: "email_c",
              label: "Email",
              type: "text",
              value: currentUpdateInvoice.email_c,
            },
            {
              name: "amount_c",
              label: "Amount",
              type: "number",
              value: currentUpdateInvoice.amount_c,
            },
            {
              name: "payment_method",
              label: "Payment Method",
              type: "select",
              value: currentUpdateInvoice.payment_method,
              options: [
                { value: "paypal", label: "PayPal" },
                { value: "payoneer", label: "Payoneer" },
                { value: "wise", label: "Wise" },
                { value: "indian_upi", label: "Indian UPI" },
                { value: "swift_india", label: "Swift India" },
              ],
            },
          ]}
          loading={updating}
          onUpdate={(data) => updateInvoiceHandler(currentUpdateInvoice, data)}
          onClose={() => setCurrentUpdateInvoice(null)}
        />
      )}
      <TableView
        tableData={invoices}
        tableName={"Invoices"}
        columns={columns}
        slice={"invoices"}
        statusList={statusList}
        statusCount={statusCount}
        filterColumns={
          filterColumns
        }
        pageIndex={pageIndex}
        pageCount={pageCount}
        count={count}
        loading={loading}
        preferences={
          preferences
        }
        refreshKey={[
          "invoices",
        ]}
        fetchNextPage={() => {
          if (
            hasNextPage &&
            !isFetchingNextPage
          ) {
            fetchNextPage();
          }
        }}
      >        <TableTitleBar Icon={FileText} title={"Invoices"} titleClass={"text-orange-700"} />
        <Table headerStyle={"  bg-orange-600"} layoutStyle={"grid grid-cols-8"} />
      </TableView></>

  );
}