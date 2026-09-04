import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";

export default function EditUser({
  item,
  onClose,
  handleUpdate,
  ...props
}) {
  const [form, setForm] = useState({
    id: "",
    name: "",
    email: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        id: item.id || "",
        name: item.name || "",
        email: item.email || "",
      });
    }
  }, [item]);

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    const updated = { ...item, ...form };

    try {
      setLoading(true);

      if (item.type === "new") {
        await props.handleCreate(updated);
        toast.success("Created successfully!");
      } else {
        await handleUpdate(updated);
        toast.success("Updated successfully!");
      }

      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key="modal-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
        >
          <motion.div
            key="modal-content"
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            {/* Loading Overlay */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>

                    <p className="text-sm font-medium text-gray-600">
                      {item.type === "new"
                        ? "Creating user..."
                        : "Saving changes..."}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute right-4 top-4 rounded-full p-1 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X />
            </button>

            <h2 className="mb-6 text-2xl font-semibold">
              {item.type === "new" ? "Create User" : "Edit User"}
            </h2>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Name
                </label>

                <input
                  disabled={loading}
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Enter name"
                  className="w-full rounded-lg border bg-gray-50 p-2.5 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Email
                </label>

                <input
                  disabled={loading}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="Enter email"
                  className="w-full rounded-lg border bg-gray-50 p-2.5 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Save Button */}
              <button
                disabled={loading}
                onClick={handleSave}
                className="flex w-full items-center justify-center rounded-xl bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {item.type === "new" ? "Creating..." : "Saving..."}
                  </>
                ) : item.type === "new" ? (
                  "Create User"
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}