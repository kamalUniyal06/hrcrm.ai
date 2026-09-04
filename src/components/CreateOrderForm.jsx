import { Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";

const ORDER_TYPES = ["GUEST POST", "LINK INSERTION"];

const CreateOrderForm = ({
  order,
  setOrder,
  creating = false,
  handleSubmit,
}) => {
  const [button, setButton] = useState(null);

  /* ---------------- DATE FORMAT ---------------- */
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

  /* ---------------- BASIC CHANGE ---------------- */
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
        ...(Array.isArray(prev.seo_backlinks) ? prev.seo_backlinks : []),
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
    const links = Array.isArray(order.seo_backlinks)
      ? [...order.seo_backlinks]
      : [];

    links[index] = {
      ...links[index],
      [key]: value,
    };

    setOrder((prev) => ({
      ...prev,
      seo_backlinks: links,
    }));
  };

  /* ---------------- REMOVE LINK ---------------- */
  const removeSeoLink = (index) => {
    const links = Array.isArray(order.seo_backlinks)
      ? order.seo_backlinks.filter((_, i) => i !== index)
      : [];

    setOrder((prev) => ({
      ...prev,
      seo_backlinks: links,
    }));
  };

  /* ---------------- VALIDATION ---------------- */
  const isFormValid = () => {
    if (!order.order_type) return false;

    if (!Array.isArray(order.seo_backlinks) || order.seo_backlinks.length === 0)
      return false;

    for (const link of order.seo_backlinks) {
      // required in both
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
  const onSubmit = (send) => {
    if (creating || !formValid) return;
    handleSubmit(send);
  };

  /* ---------------- DEFAULT SETUP ---------------- */
  useEffect(() => {
    if (!order) return;

    if (!order.order_type || !order.seo_backlinks?.length) {
      setOrder((prev) => {
        const updated = { ...prev };

        if (!updated.order_type) {
          updated.order_type = "GUEST POST";
        }

        if (
          !Array.isArray(updated.seo_backlinks) ||
          updated.seo_backlinks.length === 0
        ) {
          updated.seo_backlinks = [
            {
              backlink_url: "",
              gp_doc_url_c: "",
              website: "",
              anchor_text_c: "",
            },
          ];
        }

        return updated;
      });
    }
  }, [order]);

  /* ---------------- RENDER ---------------- */
  return (
    <div className="space-y-6">
      {/* ---------------- TABS ---------------- */}
      <div className="flex gap-3">
        {ORDER_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleChange("order_type", type)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              order.order_type === type
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* ---------------- SEO LINKS ---------------- */}
      {Array.isArray(order.seo_backlinks) &&
        order.seo_backlinks.map((link, index) => (
          <div
            key={index}
            className="border p-4 rounded-xl space-y-3 bg-gray-50 relative"
          >
            {/* DELETE BUTTON */}
            <button
              type="button"
              onClick={() => removeSeoLink(index)}
              className="absolute -top-3 -right-2 bg-red-500 text-white hover:bg-red-700 rounded-full p-1"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {/* ---------------- GUEST POST ---------------- */}
            {order.order_type === "GUEST POST" && (
              <>
                <input
                  placeholder="Website"
                  value={link.website || ""}
                  onChange={(e) =>
                    updateSeoLink(index, "website", e.target.value)
                  }
                  className="border p-2 rounded w-full"
                />

                <input
                  placeholder="Doc URL"
                  value={link.gp_doc_url_c || ""}
                  onChange={(e) =>
                    updateSeoLink(index, "gp_doc_url_c", e.target.value)
                  }
                  className="border p-2 rounded w-full"
                />
              </>
            )}

            {/* ---------------- LINK INSERTION ---------------- */}
            {order.order_type === "LINK INSERTION" && (
              <>
                <input
                  placeholder="Website"
                  value={link.website || ""}
                  onChange={(e) =>
                    updateSeoLink(index, "website", e.target.value)
                  }
                  className="border p-2 rounded w-full"
                />

                <input
                  placeholder="Backlink URL"
                  value={link.backlink_url || ""}
                  onChange={(e) =>
                    updateSeoLink(index, "backlink_url", e.target.value)
                  }
                  className="border p-2 rounded w-full"
                />

                <input
                  placeholder="Anchor Text"
                  value={link.anchor_text_c || ""}
                  onChange={(e) =>
                    updateSeoLink(index, "anchor_text_c", e.target.value)
                  }
                  className="border p-2 rounded w-full"
                />
              </>
            )}
          </div>
        ))}

      {/* ADD LINK */}
      <button
        type="button"
        onClick={addSeoLink}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg ml-5"
      >
        + Add Link
      </button>

      {/* ---------------- ACTION BUTTONS ---------------- */}
      <div className="flex justify-end items-center">
        <div className="flex gap-3">
          <button
            disabled={!formValid}
            onClick={() => {
              setButton(1);
              onSubmit(false);
            }}
            className={`px-3 py-2 rounded-lg text-white ${
              !formValid
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {creating && button === 1 ? "Saving..." : "Save"}
          </button>

          <button
            disabled={!formValid}
            onClick={() => {
              setButton(2);
              onSubmit(true);
            }}
            className={`px-3 py-2 rounded-lg text-white ${
              !formValid
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {creating && button === 2 ? "Sending..." : "Save & Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderForm;
