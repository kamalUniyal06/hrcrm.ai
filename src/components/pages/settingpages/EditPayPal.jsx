import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";

export default function EditPayPal({ item, onClose, handleUpdate }) {
  // Local form state
  const [form, setForm] = useState({
    id: "",
    name: "",
    dev_endpoint: "",
    production_endpoint: "",
    production_first_token: "",
    production_second_token: "",
  });

  // Fill state when modal opens
  useEffect(() => {
    if (item) {
      setForm({
        id: item.id,
        name: item.name || "",
        dev_endpoint: item.dev_endpoint || "",
        production_endpoint: item.production_endpoint || "",
        production_first_token: item.production_first_token || "",
        production_second_token: item.production_second_token || "",
      });
    }
  }, [item]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    const updated = { ...item, ...form };
    handleUpdate(updated);
    toast.success("Updated successfully!");
    onClose();
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key="modal-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
        >
          <motion.div
            key="modal-content"
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl relative"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-gray-200"
            >
              <X />
            </button>

            <h2 className="text-2xl font-semibold mb-4">
              Edit PayPal Settings
            </h2>

            <div className="space-y-4">
              {/* NAME */}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Name
                </label>
                <input
                  value={form.name}
                  disabled
                  className="w-full mt-1 p-2 border rounded-lg bg-gray-50"
                />
              </div>

              {/* Dev Endpoint */}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Development Endpoint
                </label>
                <input
                  value={form.dev_endpoint}
                  disabled
                  className="w-full mt-1 p-2 border rounded-lg bg-gray-50"
                />
              </div>

              {/* Production Endpoint */}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Production Endpoint
                </label>
                <input
                  value={form.production_endpoint}
                  disabled
                  className="w-full mt-1 p-2 border rounded-lg bg-gray-50"
                />
              </div>

              {/* First Token */}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  First Token
                </label>
                <input
                  value={form.production_first_token}
                  onChange={(e) =>
                    updateField("production_first_token", e.target.value)
                  }
                  className="w-full mt-1 p-2 border rounded-lg bg-gray-50"
                />
              </div>

              {/* Second Token */}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Second Token
                </label>
                <input
                  value={form.production_second_token}
                  onChange={(e) =>
                    updateField("production_second_token", e.target.value)
                  }
                  className="w-full mt-1 p-2 border rounded-lg bg-gray-50"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                className="w-full mt-2 bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
