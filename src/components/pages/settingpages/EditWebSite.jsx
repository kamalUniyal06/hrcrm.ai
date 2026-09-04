import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  X,
  Save,
  Globe,
  DollarSign,
  ShieldCheck,
  Activity,
  Link,
  FileText,
} from "lucide-react";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";

const fieldConfig = [
  {
    key: "name",
    label: "Website Name",
    type: "url",
    icon: Globe,
  },
  {
    key: "da",
    label: "DA",
    type: "number",
  },
  {
    key: "dr",
    label: "DR",
    type: "text",
  },
   {
    key: "minimum_price",
    label: "Final (Brand)",
    type: "number",
    icon: DollarSign,
  },
  {
  key: "average_amount",
  label: "Closure (Brand)",
  type: "number",
  icon: DollarSign,
},
 {
    key: "amount",
    label: "Start (Brand)",
    type: "number",
    icon: DollarSign,
  },
  {
    key: "non_brand_minimum_amount",
    label: "Final (Non-Brand)",
    type: "number",
    icon: DollarSign,
  },
  {
  key: "non_brand_average_amount",
  label: "Closure (Non-Brand)",
  type: "number",
  icon: DollarSign,
}, 
  {
    key: "non_brand_maximum_amount",
    label: "Start (Non-Brand)",
    type: "number",
    icon: DollarSign,
  },
  {
    key: "spam_score",
    label: "Spam Score",
    type: "number",
    icon: ShieldCheck,
  },
  {
    key: "google_traffic",
    label: "Google Traffic",
    type: "number",
    icon: Activity,
  },
  {
    key: "traffic",
    label: "Monthly Traffic",
    type: "text",
    icon: Activity,
  },
  {
    key: "semrush_traffic",
    label: "Semrush Traffic",
    type: "number",
    icon: Activity,
  },
  {
    key: "ahref_traffic",
    label: "Ahref Traffic",
    type: "number",
    icon: Activity,
  },
  {
    key: "premium",
    label: "Premium",
    type: "checkbox",
  },
  {
    key: "category",
    label: "Categories",
    type: "text",
    icon: FileText,
  },
  {
    key: "country",
    label: "Country",
    type: "text",
    icon: Globe,
  },
];

export default function EditWebSite({ item, onClose, handleUpdate, ...props }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (item) {
      setForm({
        id: item.id || "",
        name: item.name || "",
        slug: item.slug || "",
        da: item.da || "",
        pa: item.pa || "",
        dr: item.dr || "",
        description: item.name || "",
        spam_score: item.spam_score || "",
        google_traffic: item.google_traffic || "",
        traffic: item.traffic || "",
        ahref_traffic: item.ahref_traffic || "",
        semrush_traffic: item.semrush_traffic || "",
        amount: item.amount ?? "",
        average_amount: item.average_amount ?? "",
        non_brand_average_amount: item.non_brand_average_amount ?? "",
        minimum_price: item.minimum_price ?? "",
        non_brand_minimum_amount: item.non_brand_minimum_amount ?? "",
        non_brand_maximum_amount: item.non_brand_maximum_amount ?? "",
        premium: Number(item.premium) === 1 ? 1 : 0,
        category: item.category || "",
        country: item.country || "",
      });
    }
  }, [item]);

const updateField = (key, value) => {
  setForm((prev) => ({
    ...prev,
    [key]: value,

    // Keep description synchronized with website name
    ...(key === "name" && {
      description: value,
    }),
  }));
};

  const handleSave = () => {
    if (!form.name?.trim()) {
      toast.error("Website name cannot be empty");
      return;
    }
    console.log(form);

    const updated = { ...item, ...form, name: form.name?.trim(),
    description: form.name?.trim(), };

    console.log("Submitted website:", updated);

    if (item.type === "new") {
      props.handleCreate(updated);
    } else {
      handleUpdate(updated);
    }

    onClose();
  };

  return (
    <AnimatePresence>
      {item && (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-8 "
        >
          {" "}
          <Motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ duration: 0.25 }}
            className="bg-white w-full max-w-7xl rounded-3xl shadow-2xl my-6 max-h-[92vh] flex flex-col"
          >
            {" "}
            {/* HEADER */}
            <div className="flex items-center justify-between border-b px-8 py-5">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  {item.type === "new" ? "Create Website" : "Edit Website"}
                </h2>

                <p className="text-gray-500 mt-1 text-sm">
                  Manage website details and configurations
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-11 h-11 rounded-xl border border-gray-200 hover:bg-gray-100 flex items-center justify-center transition"
              >
                <X size={20} />
              </button>
            </div>
            {/* BODY */}
            <div className="p-8 overflow-y-auto flex-1">
              {" "}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {fieldConfig.map((field) => {
                  const Icon = field.icon;

                  return (
                    <div
                      key={field.key}
                      className="border border-gray-200 rounded-2xl p-5 bg-gray-50"
                    >
                      {/* LABEL */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {Icon && <Icon size={18} className="text-blue-600" />}

                          <label className="font-semibold text-gray-800">
                            {field.label}
                          </label>
                        </div>
                      </div>

                      {/* INPUT */}
                    {(field.type === "text" ||
  field.type === "number" ||
  field.type === "url") && (
  <input
    type={field.type}
    value={form[field.key] ?? ""}
    onChange={(e) => updateField(field.key, e.target.value)}
    placeholder={`Enter ${field.label}`}
    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
  />
)}

                      {/* CHECKBOX */}
                      {field.type === "checkbox" && (
  <label className="flex items-center gap-3">
    <input
      type="checkbox"
      checked={Number(form[field.key]) === 1}
      onChange={(e) =>
        updateField(field.key, e.target.checked ? 1 : 0)
      }
      className="w-5 h-5"
    />

    <span className="text-gray-700 font-medium">
      Enable {field.label}
    </span>
  </label>
)}

                      {/* DROPDOWN */}
                      {field.type === "dropdown" && (
                        <select
                          value={form[field.key] || ""}
                          onChange={(e) =>
                            updateField(field.key, e.target.value)
                          }
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select {field.label}</option>

                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* FOOTER */}
            <div className="border-t bg-gray-50 px-8 py-5 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-xl border border-gray-300 font-medium hover:bg-gray-100 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                disabled={props.saving}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 transition disabled:opacity-50"
              >
                <Save size={18} />

                {props.saving
                  ? "Saving..."
                  : item.type === "new"
                    ? "Create Website"
                    : "Save Changes"}
              </button>
            </div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
