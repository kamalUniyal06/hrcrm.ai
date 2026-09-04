import {
  Building2,
  CalendarDays,
  CheckCircle,
  CircleDollarSign,
  CreditCard,
  FileText,
  Link2,
  Mail,
  PackageCheck,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShieldOff,
  XCircle,
} from "lucide-react";
import SeoBacklinkList from "./SeoBacklinks";
import { createElement, useContext, useEffect, useState } from "react";
import UpdatePopup from "./UpdatePopup";
import { useDispatch } from "react-redux";
import { createLink, orderAction, updateOrder } from "../store/Slices/orders";
import { useSelector } from "react-redux";
import { LoadingChase } from "./Loading";
import { SocketContext } from "../context/SocketContext";
import { extractEmail } from "../assets/assets";
import { useOrdersByEmail } from "../queries/orders.queries";
export const OrderView = ({ data, setSend, email }) => {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState(null);
  const { creatingLinkMessage, updating } = useSelector((state) => state.orders);
  const { data: ordersData } = useOrdersByEmail(email);
  const statusLists = ordersData?.order_status_list ?? {}
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [activeSection, setActiveSection] = useState("details");
  const { invoiceOrderId } = useContext(SocketContext);
  const dispatch = useDispatch();
  const backlinks = data.seo_backlinks ?? [];
  const handleAddLink = (link) => {
    dispatch(createLink(item.id, link));
  };
  const onCompleteHandler = () => {
    setShowConsent(true);
  };
  const stats = backlinks.reduce(
    (acc, link) => {
      if (link.link_type === "dofollow") acc.dofollow += 1;
      if (link.link_type === "nofollow") acc.nofollow += 1;

      if (link.category === "internal") acc.internal += 1;
      if (link.link_type === "authoritative") acc.authoritative += 1;

      return acc;
    },
    {
      internal: 0,
      authoritative: 0,
      dofollow: 0,
      nofollow: 0,
    },
  );

  const updateStatus = (status, isSend) => {
    const updatedOrder = {
      ...data,
      order_status: status,
    };
    if (isSend) {
      setSend(updatedOrder);
    }

    dispatch(updateOrder({ order: updatedOrder }));
  };

  useEffect(() => {
    if (creatingLinkMessage) {
      setOpen(false);
      dispatch(orderAction.clearAllMessages());
    }
  }, [creatingLinkMessage]);
  useEffect(() => {
    if (
      processingPayment &&
      invoiceOrderId &&
      invoiceOrderId === data.order_id
    ) {
      setProcessingPayment(false);
      updateStatus("complete");
    }
  }, [invoiceOrderId, processingPayment, data.order_id]);

  return (
    <>
      {open && (
        <UpdatePopup
          open={open}
          onClose={() => setOpen(false)}
          title="Add Backlink"
          buttonLabel="Add"
          fields={[
            {
              label: "Link Amount",
              name: "link_amount",
              type: "number",
              value: 0,
            },
            {
              label: "Their Link",
              name: "backlink_url",
              type: "text",
              value: "",
            },
            {
              label: "Our Link",
              name: "target_url",
              type: "text",
              value: "",
            },
          ]}
          onUpdate={(link) => handleAddLink(link)}
        />
      )}

      {/* PAYPAL CONSENT */}
      <PayPalConsent
        open={showConsent}
        onCancel={() => setShowConsent(false)}
        onProceed={() => {
          setShowConsent(false);
          // setProcessingPayment(true);
          window.open(data.invoice_link_c, "_blank", "noopener,noreferrer");
        }}
      />

      {/* PROCESSING PAYPAL */}
      {processingPayment && <ProcessingLoader />}
      {updating && <PageLoader />}
      <div className="w-full min-w-0 relative p-3 sm:p-4 sm:p-5 overflow-hidden">
        <OrderHeader
          data={data}
          updateStatus={(status, isSend) => updateStatus(status, isSend)}
          onCompleteHandler={onCompleteHandler}
        />
        <OrderSections activeSection={activeSection} setActiveSection={setActiveSection} backlinkCount={backlinks.length} />
        {activeSection === "details" ? (
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-2">
            <InfoPanel icon={FileText} title="Order Information">
              <InfoRow icon={CalendarDays} label="Date" value={data.date_entered} />
              <InfoRow icon={Link2} label="Type" value={data.order_type_value} />
              <InfoRow
                icon={CircleDollarSign}
                label="Amount"
                value={`$${data.total_amount_c}`}
                valueClassName="text-blue-600"
              />
              <InfoRow icon={CheckCircle} label="Status">
                <StatusPill>
                  {statusLists[data.order_status] || data.order_status || "-"}
                </StatusPill>
              </InfoRow>
              <InfoRow
                icon={ReceiptText}
                label="Invoice Link"
                value={data.invoice_link_c}
                link
                title="View Invoice"
              />
              <InfoRow icon={CreditCard} label="Payment Type" value={data.invoice_type} />
            </InfoPanel>
            <InfoPanel icon={Link2} title="Link Details">
              <InfoRow icon={Link2} label="Total Links" value={data.seo_backlinks_count ?? backlinks.length} chip />
              <InfoRow icon={Building2} label="Internal Links" value={stats.internal} chip />
              <InfoRow icon={ShieldCheck} label="Authority Links" value={stats.authoritative} chip />
              <InfoRow icon={ShieldOff} label="No Follow Links" value={stats.nofollow} chip />
              <InfoRow icon={ShieldCheck} label="Do Follow Links" value={stats.dofollow} chip success={stats.dofollow > 0} />
            </InfoPanel>
          </div>
        ) : (
          <section className="rounded-lg border border-blue-100 bg-gradient-to-b from-blue-50/60 to-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                    <Link2 size={18} />
                  </span>
                  SEO Backlinks
                </div>
                <p className="mt-1 text-sm text-slate-500">Manage Guest Post and Link Insertion placements for this order.</p>
              </div>
              <button
                onClick={() => {
                  setItem(data);
                  setOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
              >
                <Plus size={17} />
                Add backlink
              </button>
            </div>
            {backlinks.length > 0 ? (
              <SeoBacklinkList email={email} seo_backlink={backlinks} id={data.id} orderId={data.order_id} />
            ) : (
              <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-dashed border-blue-200 bg-white text-sm font-medium text-slate-500">
                <Link2 size={22} className="mb-2 text-blue-400" />
                No backlinks have been added to this order yet.
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
};

function OrderSections({ activeSection, setActiveSection, backlinkCount }) {
  return (
    <div className="mb-4 flex justify-center">
      <div className="inline-flex rounded-full border border-blue-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => setActiveSection("details")}
          className={`rounded-full px-5 py-1.5 text-sm font-semibold transition ${activeSection === "details" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-blue-50"}`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveSection("backlinks")}
          className={`rounded-full px-5 py-1.5 text-sm font-semibold transition ${activeSection === "backlinks" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-blue-50"}`}
        >
          SEO Backlinks <span className="ml-1 text-xs opacity-80">{backlinkCount}</span>
        </button>
      </div>
    </div>
  );
}

function InfoPanel({ icon, title, children }) {
  return (
    <section className="min-w-0">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
        {createElement(icon, { size: 18, className: "text-blue-600" })}
        <span>{title}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
  link,
  children,
  title,
  chip,
  success,
  valueClassName = "text-slate-900",
}) {
  const content = children ?? value ?? "-";

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {createElement(icon, { size: 17 })}
      </span>
      <span className="min-w-0 flex-1 text-sm text-slate-500">{label}</span>
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm font-semibold text-blue-600 hover:underline"
        >
          {title}
        </a>
      ) : chip ? (
        <span
          className={`inline-flex min-w-8 justify-center rounded-lg border px-2 py-1 text-sm font-bold ${success
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-700"
            }`}
        >
          {content}
        </span>
      ) : (
        <span className={`min-w-0 truncate text-sm font-semibold ${valueClassName}`}>
          {content}
        </span>
      )}
    </div>
  );
}

function StatusPill({ children }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
      {children}
    </span>
  );
}

function Field({ label, value, link, children, title }) {
  const content = children || value;

  return (
    <div className="group perspective-1000">
      <div className="relative transform-gpu transition-all duration-500 hover:scale-105 hover:-translate-y-2">
        {/* Main card with bevel effect */}
        <div className="relative min-w-0 bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-2xl p-3 sm:p-5 border-2 border-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_10px_30px_rgba(0,0,0,0.15)] group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_20px_50px_rgba(0,0,0,0.25)] transition-all duration-500">
          <div className="relative z-10 min-w-0">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 sm:mb-3 flex flex-wrap items-center gap-2">
              <div className="w-1.5 h-1.5 shrink-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
              {label}{" "}
              {children && (
                <span className="ml-2 mb-1 text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                  {value}
                </span>
              )}
            </div>
            <div className="min-w-0 break-words text-gray-800 font-semibold text-base sm:text-lg">
              {link ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 underline decoration-2 underline-offset-4 transition-all"
                >
                  {title} →
                </a>
              ) : (
                content
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function ProcessingLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <LoadingChase />
        <p className="font-semibold">Processing your PayPal payment…</p>
      </div>
    </div>
  );
}
function OrderHeader({ data, updateStatus, onCompleteHandler }) {
  const [showModel, setShowModel] = useState(null);
  const { showBrandTimeline } = useSelector((state) => state.brandTimeline);
  return (
    <>
      {showModel && (
        <Model
          setShowModel={setShowModel}
          showModel={showModel}
          handleSubmitConfirm={() => {
            (updateStatus(showModel, showModel == "rejected_nontechnical"),
              setShowModel(null));
          }}
        />
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 pr-28">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FileText size={22} />
          </span>
          <div className="min-w-0">
            {showBrandTimeline && (
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Mail size={15} />
                <span className="truncate">
                  {extractEmail(data.real_name ?? data.email)}
                </span>
              </div>
            )}
            <div className="flex min-w-0 flex-wrap items-center gap-4">
              <h2 className="truncate text-xl font-bold text-slate-900">
                # Order ID: {data.order_id}
              </h2>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span>Order Proximity:</span>
                <span className="text-blue-600">{data.order_proximity || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.order_status == "new" && (
            <>
              <button
                onClick={() => setShowModel("accepted")}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
              >
                <CheckCircle size={17} />
                Accept
              </button>
              <button
                onClick={() => setShowModel("rejected_nontechnical")}
                className="flex items-center gap-2 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 active:scale-95"
              >
                <XCircle size={17} />
                Reject
              </button>
            </>
          )}
          {data.order_status == "accepted" && (
            <button
              onClick={onCompleteHandler}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95"
            >
              <PackageCheck size={17} />
              Complete
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Blur + dark overlay */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Loader */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <LoadingChase />
      </div>
    </div>
  );
}
function PayPalConsent({ open, onCancel, onProceed }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-xl font-bold mb-2">Confirm Payment</h3>
        <p className="text-gray-600 mb-6">
          You’ll be redirected to PayPal to complete the invoice payment. Once
          payment is confirmed, the order will be completed automatically.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Proceed to PayPal
          </button>
        </div>
      </div>
    </div>
  );
}
function Model({ setShowModel, showModel, handleSubmitConfirm }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {showModel === "rejected_nontechnical" ? "Reject" : "Accept"} Order
        </h2>

        <p className="text-gray-600 font-medium mb-6">
          Are you sure you want to continue?
        </p>

        <div className="flex justify-end gap-4">
          <button
            onClick={() => setShowModel(null)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
          >
            No
          </button>

          <button
            onClick={handleSubmitConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
