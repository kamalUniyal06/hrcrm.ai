import { Save, Send, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PageHeader from "../../PageHeader";
import {
  createOrder2,
  getOrders,
  orderAction,
} from "../../../store/Slices/orders";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import IconButton from "../../ui/Buttons/IconButton";
import { useThreadContext } from "../../../hooks/useThreadContext";
import { createPreviewOrder } from "../../PreviewOrder";
import { useTemplateByName } from "../../../queries/template.queries";
import { useContact } from "../../../queries/contact.queries";
import { queryClient } from "../../../lib/queryClient";
import { orderKeys } from "../../../queries/orders.queries";

const ORDER_TYPES = ["GUEST POST", "LINK INSERTION"];

const CreateOrders = ({ email }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { creating, message, error } = useSelector((state) => state.orders);
  const { showBrandTimeline } = useSelector((state) => state.brandTimeline);
  const { data } = useContact(email)
  const threadId = data?.contact?.thread_id
  const [send, setSend] = useState(false);
  const { handleMove } = useThreadContext();
  const getFormattedDate = () => {
    const d = new Date();
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };
  const [order, setOrder] = useState({
    order_type: "GUEST POST",
    seo_backlinks: [
      {
        backlink_url: "",
        gp_doc_url_c: "",
        website: "",
        anchor_text_c: "",
      },
    ],
  });
  const { data: liTemplate } = useTemplateByName("LI_ORDER_TEMPLATE");
  const { data: gpTemplate } = useTemplateByName("OrderORG");

  /* ---------------- CHANGE ---------------- */
  const handleChange = (key, value) => {
    setOrder((prev) => ({
      ...prev,
      [key]: value,
      date_entered_formatted: getFormattedDate(),
    }));
  };

  /* ---------------- SEO LINKS ---------------- */
  const addSeoLink = () => {
    setOrder((prev) => ({
      ...prev,
      seo_backlinks: [
        ...prev.seo_backlinks,
        {
          backlink_url: "",
          gp_doc_url_c: "",
          website: "",
          anchor_text_c: "",
        },
      ],
    }));
  };

  const updateSeoLink = (index, key, value) => {
    const links = [...order.seo_backlinks];

    links[index] = {
      ...links[index],
      [key]: value,
    };

    setOrder((prev) => ({
      ...prev,
      seo_backlinks: links,
    }));
  };

  const removeSeoLink = (index) => {
    const links = order.seo_backlinks.filter((_, i) => i !== index);

    setOrder((prev) => ({
      ...prev,
      seo_backlinks: links,
    }));
  };

  /* ---------------- VALIDATION ---------------- */
  const isFormValid = () => {
    if (!order.order_type) return false;

    if (!order.seo_backlinks.length) return false;

    for (const link of order.seo_backlinks) {
      if (!link.website?.trim()) return false;

      if (order.order_type === "GUEST POST") {
        if (!link.gp_doc_url_c?.trim()) return false;
      }

      if (order.order_type === "LINK INSERTION") {
        if (!link.backlink_url?.trim()) return false;
        if (!link.anchor_text_c?.trim()) return false;
      }
    }

    return true;
  };

  const formValid = isFormValid();

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = (isSend) => {
    if (creating || !formValid) return;
    const finalOrder = {
      ...order,
    };
    setSend(isSend);
    console.log("FINAL ORDER:", finalOrder);
    dispatch(createOrder2({ email, order, threadId }));
  };
  const handlePreview = () => {
    const html = createPreviewOrder({
      templateData: order.order_type == "GUEST POST" ? gpTemplate : liTemplate,
      order: { ...order, order_status: "New" },
      userEmail: email,
    });
    handleMove({ email, threadId, reply: html });
  };
  useEffect(() => {
    if (message) {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      if (message?.includes("Created")) {
        if (send) {
          setSend(false);
          dispatch(orderAction.clearAllMessages());
          handlePreview();
        } else {
          navigate(-1);
          dispatch(orderAction.clearAllMessages());
        }
      }
    }

    if (error) {
      toast.error(error);
      setSend(false); // reset on error too
      dispatch(orderAction.clearAllErrors());
    }
  }, [message, error]);
  /* ---------------- RENDER ---------------- */
  return (
    <div className="w-full min-w-0 flex flex-col gap-3 relative border rounded-2xl p-3 sm:p-6 bg-white shadow-sm">
      <PageHeader title={"CREATE ORDER"} showAdd={false} />
      {/* ---------------- TABS ---------------- */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {ORDER_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleChange("order_type", type)}
            className={`px-3 py-2 rounded-lg text-sm sm:text-base transition ${order.order_type === type
              ? "bg-blue-600 text-white"
              : "bg-gray-200 hover:bg-gray-300"
              }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* ---------------- LINKS ---------------- */}
      {order.seo_backlinks.map((link, index) => (
        <div
          key={index}
          className="border p-4 rounded-xl space-y-3 bg-gray-50 relative"
        >
          <button
            type="button"
            onClick={() => removeSeoLink(index)}
            className="absolute -top-3 -right-2 bg-red-100 text-red-500 rounded-full p-1"
          >
            <Trash2 className="w-6 h-6" />
          </button>

          {/* GUEST POST */}
          {order.order_type === "GUEST POST" && (
            <>
              <input
                placeholder="Website"
                value={link.website}
                onChange={(e) =>
                  updateSeoLink(index, "website", e.target.value)
                }
                className="border p-2 rounded w-full"
              />

              <input
                placeholder="Doc URL"
                value={link.gp_doc_url_c}
                onChange={(e) =>
                  updateSeoLink(index, "gp_doc_url_c", e.target.value)
                }
                className="border p-2 rounded w-full"
              />
            </>
          )}

          {/* LINK INSERTION */}
          {order.order_type === "LINK INSERTION" && (
            <>
              <input
                placeholder="Website"
                value={link.website}
                onChange={(e) =>
                  updateSeoLink(index, "website", e.target.value)
                }
                className="border p-2 rounded w-full"
              />

              <input
                placeholder="Backlink URL"
                value={link.backlink_url}
                onChange={(e) =>
                  updateSeoLink(index, "backlink_url", e.target.value)
                }
                className="border p-2 rounded w-full"
              />

              <input
                placeholder="Anchor Text"
                value={link.anchor_text_c}
                onChange={(e) =>
                  updateSeoLink(index, "anchor_text_c", e.target.value)
                }
                className="border p-2 rounded w-full"
              />
            </>
          )}
        </div>
      ))}

      {/* ADD */}
      <button
        onClick={addSeoLink}
        className="px-3 py-2 w-fit bg-blue-100 text-blue-500 rounded-lg "
      >
        + Add Link
      </button>

      {/* ACTIONS */}
      <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
        <IconButton
          icon={Save}
          label="Save"
          onClick={() => handleSubmit(false)}
          loading={creating && !send}
          disabled={!formValid}
          className={`bg-green-100 hover:bg-green-200 
      ${!formValid ? "opacity-60 cursor-not-allowed" : ""}`}
        />

        <IconButton
          icon={Send}
          label="Save & Send"
          onClick={() => handleSubmit(true)}
          loading={creating && send}
          disabled={!formValid}
          className={`bg-indigo-100 hover:bg-indigo-200 
      ${!formValid ? "opacity-60 cursor-not-allowed" : ""}`}
        />
      </div>
    </div>
  );
};

export default CreateOrders;
