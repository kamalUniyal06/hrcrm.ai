import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Globe2, Lightbulb, Pencil, Plus, Send } from "lucide-react";
import PageHeader from "../../PageHeader";
import { useThreadContext } from "../../../hooks/useThreadContext";
import { extractEmail } from "../../../assets/assets";
import { OrderView } from "../../OrderView";
import { createPreviewOrder } from "../../PreviewOrder";
import { orderAction } from "../../../store/Slices/orders";
import { toast } from "react-toastify";
import { useTemplateByName } from "../../../queries/template.queries";
import { orderKeys, useOrdersByEmail } from "../../../queries/orders.queries";
import { useContact } from "../../../queries/contact.queries";
import { queryClient } from "../../../lib/queryClient";

export default function ThreadOrders({ email, id }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [currentOrders, setCurrentOrders] = useState([]);
  const [activeOrderIndex, setActiveOrderIndex] = useState(0);
  const [send, setSend] = useState();
  const { data } = useContact(email)
  const threadId = data?.contact?.thread_id
  const { message, error } = useSelector((state) => state.orders);
  const { data: ordersData, isLoading: ordersLoading } = useOrdersByEmail(email);
  const orders = ordersData?.data ?? []
  const { showBrandTimeline, contacts } = useSelector(
    (state) => state.brandTimeline,
  );
  const { handleMove } = useThreadContext();
  useEffect(() => {
    let activeOrders = [];
    if (orders.length == 0) {
      setCurrentOrders([]);
      return
    }
    if (id) {
      activeOrders = orders.filter((o) => o.id == id);
    } else {

      activeOrders = orders.filter(
        (d) =>
          d.order_status !== "wrong" &&
          d.order_status !== "rejected_nontechnical" &&
          d.order_status !== "completed",
      );
    }
    setCurrentOrders(activeOrders);
  }, [orders, email, id]);

  useEffect(() => {
    setActiveOrderIndex((index) =>
      currentOrders.length ? Math.min(index, currentOrders.length - 1) : 0,
    );
  }, [currentOrders.length]);

  const handleCreate = () => {
    navigate(`/orders/create?email=${email}`);
  };

  const { data: liTemplate } = useTemplateByName("LI_ORDER_TEMPLATE");
  const { data: gpTemplate } = useTemplateByName("OrderORG");

  const handlePreview = (order, itemEmail, itemThreadId) => {
    const html = createPreviewOrder({
      templateData: order.order_type == "GUEST POST" ? gpTemplate : liTemplate,
      order,
      userEmail: itemEmail,
    });
    console.log("ORDER PDF", order.invoice_pdf);
    handleMove({
      email: itemEmail,
      threadId: itemThreadId,
      reply: html,
      htmlFile: order.invoice_pdf,
    });
  };
  useEffect(() => {
    if (message) {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      toast.success(message);
      if (message?.includes("Updated")) {
        if (send) {
          setSend(undefined);
          dispatch(orderAction.clearAllMessages());
          handlePreview(send.item, send.itemEmail, send.itemThreadId);
        } else {
          dispatch(orderAction.clearAllMessages());
        }
      }
    }
    if (error) {
      toast.error(error);
      dispatch(orderAction.clearAllMessages());
    }
  }, [message, error]);
  const activeOrder = currentOrders[activeOrderIndex];
  const itemEmail =
    activeOrder && showBrandTimeline
      ? extractEmail(activeOrder.real_name ?? activeOrder.email)
      : email;
  const itemThreadId =
    activeOrder && showBrandTimeline
      ? contacts.find((contact) => contact.email1 == email)?.thread_id
      : threadId;

  return (
    <div className="w-full min-w-0">
      {/* 🔥 TABLE */}
      <div className="flex-1 min-w-0 relative border border-blue-100 rounded-lg p-5 bg-white shadow-sm overflow-hidden">
        <PageHeader
          title={"ORDERS"}
          onAdd={() => handleCreate(email)}
        />
        {ordersLoading && (
          <div className="space-y-3 mt-4">
            {Array.from({
              length: 2,
            }).map((_, i) => (
              <div
                key={i}
                className="h-30 rounded-xl bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        )}
        {!ordersLoading && currentOrders.length === 0 && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-medium text-slate-500">
            No active orders found.
          </div>
        )}
        {activeOrder && (
          <>
            <OrderPicker
              orders={currentOrders}
              activeIndex={activeOrderIndex}
              setActiveIndex={setActiveOrderIndex}
            />
            <div
              key={activeOrder.id}
              className="relative mt-4 rounded-lg border border-blue-100 overflow-hidden bg-white"
            >
              <div className="absolute top-4 right-5 flex gap-2 z-30">
                {showBrandTimeline && (
                  <button
                    onClick={() =>
                      navigate(`/orders/create?email=${itemEmail}`)
                    }
                    className="p-2 rounded-lg border border-blue-100 bg-white text-blue-600 shadow-sm hover:bg-blue-50 transition active:scale-95"
                    title="Create order for this email"
                  >
                    <Plus size={17} />
                  </button>
                )}
                <button
                  onClick={() =>
                    navigate(`/orders/edit?email=${itemEmail}&id=${activeOrder.id}`)
                  }
                  className="p-2 rounded-lg border border-blue-100 bg-white text-slate-700 shadow-sm hover:bg-blue-50 transition active:scale-95"
                  title="Edit this order"
                >
                  <Pencil size={17} />
                </button>

                <button
                  onClick={() => {
                    handlePreview(activeOrder, itemEmail, itemThreadId);
                  }}
                  className="p-2 rounded-lg border border-blue-100 bg-white text-slate-700 shadow-sm hover:bg-blue-50 transition active:scale-95"
                  title="View preview"
                >
                  <Send size={17} />
                </button>
              </div>
              <OrderView
                setSend={(item) => setSend({ item, itemEmail, itemThreadId })}
                data={activeOrder}
                email={email}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OrderPicker({ orders, activeIndex, setActiveIndex }) {
  if (orders.length <= 1) return null;

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Showing order {activeIndex + 1} of {orders.length}
        </div>
        <div className="flex items-center gap-1">
          <PagerButton
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((index) => Math.max(index - 1, 0))}
          >
            <ChevronLeft size={15} />
          </PagerButton>
          {pageItems(orders.length, activeIndex).map((item, index) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-1 text-xs text-slate-400">...</span>
            ) : (
              <button
                key={item}
                onClick={() => setActiveIndex(item)}
                className={`h-7 min-w-7 rounded-md px-2 text-xs font-semibold transition ${item === activeIndex
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-blue-50"
                  }`}
              >
                {item + 1}
              </button>
            ),
          )}
          <PagerButton
            disabled={activeIndex === orders.length - 1}
            onClick={() =>
              setActiveIndex((index) => Math.min(index + 1, orders.length - 1))
            }
          >
            <ChevronRight size={15} />
          </PagerButton>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order, index) => {
          const backlink = order.seo_backlinks?.[0] ?? {};
          const website = backlink.name || backlink.website || order.website || "-";
          const idea =
            order.order_type_value ||
            order.order_type ||
            (backlink.type_c === "GP" ? "Guest Post" : "Link Insertion");

          return (
            <button
              key={order.id}
              onClick={() => setActiveIndex(index)}
              className={`flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${index === activeIndex
                ? "border-blue-300 bg-white shadow-sm"
                : "border-transparent bg-white/70 hover:border-blue-200 hover:bg-white"
                }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-600">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  #{order.order_id}
                </span>
                <span className="mt-1 flex min-w-0 items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <Globe2 size={13} className="shrink-0" />
                    <span className="truncate">{website}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <Lightbulb size={13} />
                    {idea}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PagerButton({ children, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function pageItems(total, activeIndex) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index);

  const visible = new Set([0, total - 1, activeIndex - 1, activeIndex, activeIndex + 1]);
  const items = [];
  let previous = -1;

  [...visible]
    .filter((index) => index >= 0 && index < total)
    .sort((a, b) => a - b)
    .forEach((index) => {
      if (index - previous > 1) items.push("ellipsis");
      items.push(index);
      previous = index;
    });

  return items;
}
