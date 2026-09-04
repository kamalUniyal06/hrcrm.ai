import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

export default function UpdatePopup({
  open,
  title = "Update",
  fields = [],
  loading = false,
  onUpdate,
  buttonLabel = "Update",
  onClose,
}) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const initial = {};
    fields.forEach((f) => {
      initial[f.name] = f.value ?? "";
    });
    setFormData(initial);
  }, []); // ✅ fix: add dependency

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * ✅ Validation Function
   */
  const validateForm = () => {
    for (let field of fields) {
      if (field.required) {
        const value = formData[field.name];

        if (!value || value.toString().trim() === "") {
          toast.error(`${field.label || field.name} is required`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onUpdate(formData);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl"
            initial={{ scale: 0.95, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 30 }}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{title}</h3>
              <button
                disabled={loading}
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* FORM */}
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-xs text-gray-600 mb-1">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      disabled={field.disabled || loading}
                      value={formData[field.name]}
                      placeholder={field.placeholder}
                      onChange={(e) =>
                        handleChange(field.name, e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-2"
                      rows={4}
                    />
                  ) : field.type === "select" ? (
                    <select
                      disabled={field.disabled || loading}
                      value={formData[field.name]}
                      onChange={(e) =>
                        handleChange(field.name, e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      disabled={field.disabled || loading}
                      value={formData[field.name]}
                      placeholder={field.placeholder}
                      onChange={(e) =>
                        handleChange(field.name, e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* ACTIONS */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-white ${loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 cursor-pointer"
                  }`}
              >
                {loading ? buttonLabel + "ing..." : buttonLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}