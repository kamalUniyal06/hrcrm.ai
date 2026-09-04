import { useDispatch, useSelector } from "react-redux";
import { extractEmail } from "../assets/assets";
import { Titletooltip } from "./TitleTooltip";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useContext, useMemo } from "react";
import { LoadingSpin } from "./Loading";
import { createOrder, orderAction } from "../store/Slices/orders";
import { toast } from "react-toastify";
import { PageContext } from "../context/pageContext";
import { useRef } from "react";
import {
  Crown,
  Eye,
  FileText,
  Gift,
  Handshake,
  Plus,
  RefreshCcw,
  RefreshCcwIcon,
  ShoppingCart,
} from "lucide-react";
import { getSync, syncAction } from "../store/Slices/syncSlice";
import SyncSelectionModal from "./SyncSelectionModal";
import IconButton from "../components/ui/Buttons/IconButton"
import { useMailerSummary } from "../queries/mailerSummary.queries";
import { useTimeline } from "../context/TimelineContext";
import { useDealsByEmail } from "../queries/deals.queries";
import { useOrdersByEmail } from "../queries/orders.queries";
import { useOffersByEmail } from "../queries/offers.queries";
import { useInfiniteEmails } from "../queries/email.queries";
import { useEmailInvoices } from "../queries/invoice.queries";

const MailerSummaryHeader = () => {
  const { currentEmail } = useTimeline()
  const email = currentEmail;
  const {
    syncType,
    syncData,
    loading: syncing,
    message,
    error,
    count,
  } = useSelector((state) => state.sync);
  const [showSyncData, setShowSyncData] = useState(false);
  const dispatch = useDispatch();
  const { data: ordersData, isLoading: ordersLoading } = useOrdersByEmail(currentEmail);
  const { data: offersData, isLoading: offersLoading } = useOffersByEmail(currentEmail);
  const { data: dealsData, isLoading: dealsLoading } = useDealsByEmail(currentEmail);
  const { data: invoiceData, isLoading: invoiceLoading } = useEmailInvoices(currentEmail);
  const orders = ordersData?.data ?? []
  const offers = offersData?.data ?? []
  const deals = dealsData?.data ?? []
  const invoices = invoiceData?.records ?? []
  const { showBrandTimeline } = useSelector((state) => state.brandTimeline);

  const emailData = useMemo(() => ({
    orders: orders.filter(
      d => !["wrong", "rejected_nontechnical", "completed"].includes(d.order_status)
    ),
    deals: deals.filter(d => d.status === "active"),
    offers: offers.filter(d => d.offer_status === "active"),
    invoices: invoices.filter(d => d.status_c === "SENT"),
  }), [orders, deals, offers, invoices, email]);
  const handleSync = (type) => {
    setShowSyncData(true);
    dispatch(getSync(type));
  };
  /* ---------------- ORDERS ---------------- */

  useEffect(() => {
    if (message) {
      toast.success(message);
      dispatch(syncAction.clearAllMessage());
    }
    if (error) {
      toast.error(error);
      dispatch(syncAction.clearAllErrors());
    }
  }, [message, error]);
  return (
    <>
      {showSyncData && count > 0 && (
        <SyncSelectionModal
          onClose={() => setShowSyncData(false)}
          type={syncType}
          data={syncData}
        />
      )}

      <div className=" p-4 bg-slate-50 rounded-3xl shadow-xl border border-slate-200 flex flex-col gap-3">
        {/* STATS CARDS */}
        <div className="rounded-3xl shadow-sm p-1">
          <div className="grid grid-cols-1 gap-3">
            <SummaryCard
              type="offers"
              title="NO OFFERS"
              Icon={Gift}
              bg={"bg-green-500"}
              color="green"
              data={emailData.offers}
              handleSync={() => handleSync("offers")}
              loading={offersLoading}
            />

            <SummaryCard
              type="orders"
              title="NO ORDERS"
              Icon={ShoppingCart}
              bg={"bg-cyan-500"}
              color="cyan"
              data={emailData.orders}
              handleSync={() => handleSync("orders")}
              loading={ordersLoading}
            />

            <SummaryCard
              type="deals"
              title="NO DEALS"
              Icon={Handshake}
              bg={"bg-blue-500"}
              color="blue"
              data={emailData.deals}
              handleSync={() => handleSync("deals")}
              loading={dealsLoading}
            />

            <SummaryCard
              type="invoices"
              title="NO INVOICES"
              Icon={FileText}
              bg={"bg-orange-500"}
              color="orange"
              data={emailData.invoices}
              handleSync={() => handleSync("invoices")}
              loading={invoiceLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default MailerSummaryHeader;



function MailerSummary() {
  const { currentEmail } = useTimeline()
  const { data, isPending, refetch } = useMailerSummary(currentEmail);
  const mailersSummary = data?.mailers_summary
  return (
    <>
      {isPending ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm animate-pulse"
            >
              <div className="h-3 w-24 bg-gray-200 rounded mb-3"></div>

              <div className="h-5 w-40 bg-gray-300 rounded mb-2"></div>

              <div className="h-3 w-28 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : mailersSummary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold">
              Created At
            </div>

            <div className="font-semibold text-gray-900 mt-1">
              {mailersSummary?.date_entered_formatted || ""}
            </div>

            <div className="text-xs text-gray-500">
              {mailersSummary?.date_entered || ""}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold">
              Subject
            </div>

            <Titletooltip content={mailersSummary?.subject || "No Subject"}>
              <div className="font-semibold text-gray-900 mt-1 cursor-pointer hover:text-blue-600 truncate max-w-[280px]">
                {mailersSummary?.subject || ""}
              </div>
            </Titletooltip>
          </div>

          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold">
              Motive
            </div>

            <Titletooltip content={mailersSummary?.correct_motive || "N/A"}>
              <div className="font-semibold text-gray-900 mt-1 cursor-pointer hover:text-blue-600 truncate max-w-[280px]">
                {mailersSummary?.correct_motive || ""}
              </div>
            </Titletooltip>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-gray-50 rounded-3xl shadow-xl border border-white/40 flex flex-col items-center gap-4 mb-2">
          <p className="text-gray-800 font-semibold">
            No mail summary available for this email.
          </p>

          <button
            onClick={() => refetch()}
            className="px-6 flex gap-2 items-center py-2 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-700 transition"
          >
            <RefreshCcwIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>
      )}
    </>
  );
}
/* ===================== SUMMARY CARD ===================== */
function SummaryCard({
  type,
  title,
  Icon,
  handleSync,
  bg,
  color,
  data,
  loading,
}) {
  const { setSidebarCollapsed, handleDateClick } = useContext(PageContext);
  const { syncType, loading: syncing } = useSelector((state) => state.sync);
  const { showBrandTimeline } = useSelector((state) => state.brandTimeline);
  const { creating, message, error } = useSelector((state) => state.orders);
  const { currentEmail: email } = useTimeline();

  const dispatch = useDispatch();
  const navigateTo = useNavigate();
  const [highlight, setHighlight] = useState(false);
  const prevLengthRef = useRef(data?.length || 0);

  useEffect(() => {
    if (type !== "orders") return;
    if (message) {
      toast.success(message);
      dispatch(orderAction.clearAllMessages());
    }

    if (error) {
      toast.error(error);
      dispatch(orderAction.clearAllErrors());
    }
  }, [dispatch, creating, message, error]);

  useEffect(() => {
    if (type !== "orders") return;

    if ((data?.length || 0) > prevLengthRef.current) {
      setHighlight(true);

      const timer = setTimeout(() => {
        setHighlight(false);
      }, 25000); // ✅ 25 seconds

      return () => clearTimeout(timer); // cleanup
    }

    prevLengthRef.current = data?.length || 0;
  }, [data, type]);

  const handleClick = () => {
    setSidebarCollapsed(true);
    if (type == 'invoices') {
      handleDateClick({
        email: email,
        navigate: '/invoices'
      })
      return;

    }
    if (type === "orders" && data?.length === 0) {
      console.log("EMAIL", email)
      dispatch(createOrder(email));
      return;
    }

    data?.length > 0
      ? navigateTo(`/${type}/view?email=${email}`)
      : navigateTo(`/${type}/create?email=${email}`);
  };

  const colorMap = {
    green: "text-green-600",
    blue: "  text-blue-600",
    cyan: " text-cyan-600",
    orange: " text-orange-600",
  };

  return (
    <div
      /* No `scale-*` here on purpose: a transform on an in-flow card adds
         horizontal scrollable overflow to the scrolling <main>, and makes the
         card the containing block for any position:fixed descendant. The ring
         and shadow carry the emphasis without touching layout. */
      className={`flex items-center justify-between rounded-2xl border-t-2 border-blue-100 p-3 ${colorMap[color]} ${highlight
        ? "ring-2 ring-cyan-400/70 shadow-lg shadow-cyan-400/40 transition-all duration-500 ease-out"
        : "transition-all duration-300"
        }`}
    >
      {(creating && type === "orders") ||
        loading ||
        (syncType == type && syncing) ? (
        <LoadingSpin color={color} size={23} stroke="3" />
      ) : (
        <>
          <div className="flex items-center gap-3">
            {type == "orders" ? (
              <button
                className="cursor-pointer"
                onClick={() =>
                  navigateTo(`/orders/create?email=${email}`)
                }
              >
                <img
                  width="36"
                  height="36"
                  src="https://img.icons8.com/arcade/64/plus.png"
                  alt="plus"
                />
              </button>
            ) : (
              <div
                className={` relative w-10 h-10 rounded-xl ${bg} shadow flex items-center justify-center text-white text-xl`}
              >
                <Icon />
                {showBrandTimeline && <Crown className="absolute -top-4 left-2 text-yellow-600 w-5 h-5" />}
              </div>
            )}

            <div>
              <p className="text-sm font-semibold">
                {data?.length > 0
                  ? `${data.length} ${data.length === 1 ? type.slice(0, -1).toUpperCase() : type.toUpperCase()}`
                  : title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {type == "orders" && data?.length > 0 && <IconButton
              onClick={() => dispatch(createOrder(email))}
              disabled={type == "invoices"}
              icon={Plus}
              label="Fetch Order"
              className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-lg font-bold hover:scale-110 transition"
            />
            }
            <IconButton
              onClick={handleClick}
              disabled={type == "invoices" && data?.length == 0}
              icon={data?.length > 0 ? Eye : Plus}
              label={data?.length > 0 ? `View ${type}` : `${type == "orders" ? "Fetch" : "Create"} ${type}`}
              className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-lg font-bold hover:scale-110 transition"
            />
            <IconButton
              onClick={handleSync}
              icon={RefreshCcw}
              label={`Fetch ${type} from threads`}
              disabled={syncing || type == "invoices"}
              className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-lg font-bold hover:scale-110 transition"
            />

          </div>
        </>
      )}
    </div>
  );
}