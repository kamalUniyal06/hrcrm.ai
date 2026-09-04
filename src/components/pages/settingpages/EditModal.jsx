import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";

const TABS = [
  { key: "description", label: "Current Prompt" },
  { key: "role_prompt", label: "System Prompt" },
  { key: "output_format", label: "Output Prompt" },
  { key: "overwrite_prompt", label: "Default Prompt" },
];

export default function EditModal({ item, onClose, handleUpdate, stages }) {
  const [activeTab, setActiveTab] = useState("description");

  const [form, setForm] = useState({
    id: "",
    name: "",
    motive: "",
    type: "",
    stage: "",
    description: "",
    role_prompt: "",
    output_format: "",
    overwrite_prompt: "",
  });

  useEffect(() => {
    if (item) {
      setForm({
        id: item.id,
        name: item.name || "",
        motive: item.motive || "",
        type: item.type || "",
        stage: item.stage,
        description: item.description || "",
        role_prompt: item.role_prompt || "",
        output_format: item.output_format || "",
        overwrite_prompt: item.overwrite_prompt || "",
      });
    }
  }, [item]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    const success = await handleUpdate({ ...item, ...form });

    if (success) {
      toast.success("Updated successfully!");
      onClose();
    } else {
      toast.error("Update failed!");
    }
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          onClick={onClose} // 👈 outside click closes modal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()} // 👈 prevent inside click
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            /* max-h + scroll: the body holds a tall textarea, which on a phone
               would push the save button off screen. */
            className="flex max-h-[92vh] w-full min-w-0 max-w-4xl flex-col overflow-y-auto bg-white rounded-2xl p-4 sm:p-6 shadow-xl relative"
          >
            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 sm:right-4 sm:top-4 p-1 rounded-full hover:bg-gray-200 cursor-pointer"
            >
              <X />
            </button>

            <h2 className="pr-8 text-lg sm:text-2xl font-semibold mb-4 sm:mb-6">Edit Item</h2>

            {/* Top Fields */}
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:gap-4 sm:mb-6">
              <Input
                label="Name"
                value={form.name}
                onChange={(val) => updateField("name", val)}
              />

              <Input
                label="Motive"
                value={form.motive}
                onChange={(val) => updateField("motive", val)}
              />

              <Input
                label="Type"
                value={form.type}
                onChange={(val) => updateField("type", val)}
              />
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-600">
                  Stage
                </label>

                <select
                  value={form.stage || ""}
                  onChange={(e) => updateField("stage", e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg bg-white"
                >
                  <option value="">Select Stage</option>

                  {Object.keys(stages || {}).map((key) => (
                    <option key={key} value={key}>
                      {stages[key]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b mb-4 bg-gray-200 rounded-xl p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative z-10 w-1/2 py-2 text-sm font-medium transition-colors duration-300 cursor-pointer
                  ${activeTab === tab.key
                      ? "text-purple-600 bg-white rounded-xl"
                      : "text-gray-600 bg-gray-200 rounded-xl"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <div className="mb-6">
              <textarea
                value={form[activeTab]}
                onChange={(e) => updateField(activeTab, e.target.value)}
                /* was a flat h-120 (480px), taller than the room a phone has
                   left once the header, tabs and save button are counted */
                className="w-full h-[45vh] min-h-[180px] sm:h-120 p-3 border rounded-xl bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${TABS.find((t) => t.key === activeTab)?.label
                  }`}
              />
            </div>

            {/* Save Button (RIGHT) */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition cursor-pointer"
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

const Input = ({ label, value, onChange, disabled = false }) => (
  <div className="min-w-0 flex-1">
    <label className="text-sm font-medium text-gray-600">{label}</label>
    <input
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      disabled={disabled}
      className={`w-full mt-1 p-2 border rounded-lg 
        ${disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"}
      `}
    />
  </div>
);
