import { useEffect, useState } from "react";
import {
  DollarSign,
  Package,
  Send,
  Save,
  FileEdit,
  Dot,
  Link2Icon,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import PageHeader from "../../PageHeader";
import IconButton from "../../ui/Buttons/IconButton";
import {
  getOrders,
  orderAction,
  updateOrder,
} from "../../../store/Slices/orders";
import { toast } from "react-toastify";
import { useThreadContext } from "../../../hooks/useThreadContext";
import { createPreviewOrder } from "../../PreviewOrder";
import { useNavigate } from "react-router-dom";
import { useTemplateByName } from "../../../queries/template.queries";
import { orderKeys, useOrdersByEmail } from "../../../queries/orders.queries";
import { queryClient } from "../../../lib/queryClient";
import { useContact } from "../../../queries/contact.queries";

export default function EditOrder({ id, email }) {
  const [order, setOrder] = useState({});
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { updating, message, error } =
    useSelector((s) => s.orders);
  const { data } = useContact(email)
  const threadId = data?.contact?.thread_id
  const { data: ordersData, isLoading: ordersLoading } = useOrdersByEmail(email);
  const orders = ordersData?.data ?? []
  const statusLists = ordersData?.order_status_list ?? {}
  const paymentTypes = ordersData?.invoice_type_list ?? {}
  const { showBrandTimeline } = useSelector((s) => s.brandTimeline);
  const { handleMove } = useThreadContext();
  const [send, setSend] = useState(false);
  const { data: liTemplate } = useTemplateByName("LI_ORDER_TEMPLATE");
  const { data: gpTemplate } = useTemplateByName("OrderORG");

  const handleChange = (key, value) => {
    setOrder((prev) => ({ ...prev, [key]: value }));
  };
  const handleUpdate = (isSend = false) => {
    setSend(isSend);
    dispatch(updateOrder({ order }));
  };
  useEffect(() => {
    if (ordersLoading) return
    const order = orders.find(
      (o) => o.id == id,
    );
    if (!order) {
      navigate("/");
      return;
    }
    setOrder(order);
  }, [orders, threadId, id, ordersLoading]);
  const handlePreview = () => {
    const html = createPreviewOrder({
      templateData: order.order_type == "GUEST POST" ? gpTemplate : liTemplate,
      order: { ...order },
      userEmail: email,
    });
    handleMove({ email: email, threadId, reply: html });
  };
  useEffect(() => {
    if (message) {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      toast.success(message);
      if (message?.includes("Updated")) {
        if (send) {
          setSend(false);
          dispatch(orderAction.clearAllMessages());
          handlePreview();
        } else {
          dispatch(orderAction.clearAllMessages());
          navigate(-1);
        }
      }
    }

    if (error) {
      toast.error(error);
      setSend(false); // reset on error too
      dispatch(orderAction.clearAllMessages());
    }
  }, [message, error]);

  return (
    <div className="w-full min-w-0">
      {/* 🔥 TABLE */}
      <div className="min-w-0 relative border rounded-2xl p-3 sm:p-6 bg-white shadow-sm">
        <PageHeader title={"Edit Order"} showAdd={false} />
        {/* Card */}
        <div className="bg-white ">
          {/* Order Info */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">
              <Package className="h-4 w-4 text-violet-500" />
              Order Information
            </h2>

            <div className="grid gap-4 md:grid-cols-3 sm:gap-6">
              {/* Order ID */}
              <div>
                <label className="block text-sm mb-1"># Order ID</label>
                <input
                  value={order.order_id}
                  disabled={true}
                  onChange={(e) => handleChange("order_id", e.target.value)}
                  className="w-full border rounded-lg px-3 h-11 bg-slate-200"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm mb-1 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Order Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5">$</span>
                  <input
                    type="number"
                    value={order.total_amount_c}
                    onChange={(e) =>
                      handleChange("total_amount_c", e.target.value)
                    }
                    className="w-full border rounded-lg pl-7 h-11 bg-slate-50"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm mb-1 flex items-center gap-1">
                  <Dot className="w-5 h-5 text-green-500" />
                  Order Status
                </label>
                <select
                  value={order.order_status}
                  onChange={(e) => handleChange("order_status", e.target.value)}
                  className="w-full border rounded-lg h-11 px-3 bg-slate-50"
                >
                  {Object.entries(statusLists).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm mb-1 flex items-center gap-1">
                  <Dot className="w-5 h-5 text-green-500" />
                  Payment Type
                </label>
                <select
                  value={order.invoice_type}
                  onChange={(e) => handleChange("invoice_type", e.target.value)}
                  className="w-full border rounded-lg h-11 px-3 bg-slate-50"
                >
                  {Object.entries(paymentTypes).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Additional */}
          <div className="mb-6 sm:mb-8">
            {/* Two nowrap radio labels plus the invoice field cannot share one
                row on a phone, so they stack until there is room. */}
            <div className="flex flex-col gap-4 lg:flex-row lg:gap-9 lg:items-center">
              {/* Order Type */}
              <div className="min-w-0 lg:flex-shrink-0">
                <label className="block text-sm mb-1 flex items-center gap-1">
                  <Package className="w-4 h-4 text-black-500" />
                  Order Status
                </label>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {["LINK INSERTION", "GUEST POST"].map((type) => (
                    <label
                      key={type}
                      className={`whitespace-nowrap px-3 py-2 text-sm sm:px-4 sm:text-base border rounded-lg cursor-pointer transition 
          ${order.order_type === type
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-300"
                        }`}
                    >
                      <input
                        type="radio"
                        name="order_type"
                        value={type}
                        checked={order.order_type === type}
                        onChange={(e) =>
                          handleChange("order_type", e.target.value)
                        }
                        className="hidden"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              {/* Invoice */}
              <div className="flex-1 min-w-0">
                <label className="block text-sm mb-1 flex items-center gap-2">
                  <Link2Icon className="w-4 h-4 text-black-500" />
                  Invoice Link
                </label>
                <input
                  type="url"
                  value={order.invoice_link_c}
                  onChange={(e) =>
                    handleChange("invoice_link_c", e.target.value)
                  }
                  placeholder="https://example.com"
                  className="w-full lg:w-[90%] border rounded-lg h-11 px-3 bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="mb-8">
            <label className="block text-sm mb-2 flex gap-2 items-center">
              <FileEdit className="w-4 h-4 text-blue-500" />
              Note
            </label>
            <textarea
              rows={4}
              value={order.note}
              onChange={(e) => handleChange("note", e.target.value)}
              className="w-full border rounded-lg p-3 bg-slate-50"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <IconButton
              icon={Save}
              label="Update"
              onClick={() => handleUpdate(false)}
              loading={updating && !send}
              disabled={updating}
              className={`bg-green-100 hover:bg-green-200 
      `}
            />

            <IconButton
              icon={Send}
              label="Update & Send"
              onClick={() => handleUpdate(true)}
              loading={updating && send}
              disabled={updating}
              className={`bg-indigo-100 hover:bg-indigo-200 `}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
