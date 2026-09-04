import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import {fetchGpc} from "../../services/api";
import {
  Bell,
  CalendarDays,
  Database,
  Edit3,
  Plus,
  Save,
  SearchX,
  Trash2,
  X,
} from "lucide-react";
import { CREATE_DEAL_API_KEY } from "../../store/constants";
import useModule from "../../hooks/useModule";
import { apiRequest } from "../../services/api";

const MODULE_NAME = "outr_reminder_managment";
const MotionTr = motion.tr;
const MotionDiv = motion.div;

const emptyForm = {
  name: "",
  event: "",
  reminder_type: "",
  interval_type_c: "",
  priority_c: "",
  delay_c: "",
  description: "",
};

const fieldConfig = [
  { key: "name", label: "Reminder Name", required: true },
  { key: "event", label: "Event" },
  { key: "reminder_type", label: "Reminder Type" },
  { key: "interval_type_c", label: "Interval" },
  { key: "priority_c", label: "Priority" },
  { key: "delay_c", label: "Delay" },
];

const getBaseEndpoint = (crmEndpoint = "") => crmEndpoint.split("?")[0];

const ReminderManagementPage = () => {
  const { crmEndpoint } = useSelector((state) => state.user);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const apiHeaders = {
    "x-api-key": CREATE_DEAL_API_KEY,
    "Content-Type": "application/json",
  };

  const listUrl = `${getBaseEndpoint(
    crmEndpoint,
  )}?entryPoint=get_post_all&action_type=get_data`;

  const { loading, data, error, setData, refetch } = useModule({
    url: listUrl,
    method: "POST",
    body: {
      module: MODULE_NAME,
    },
    headers: apiHeaders,
    name: "REMINDER MANAGEMENT",
  });

  const records = useMemo(() => {
    if (!Array.isArray(data)) return [];

    return [...data].sort(
      (a, b) =>
        new Date(b.date_entered || 0).getTime() -
        new Date(a.date_entered || 0).getTime(),
    );
  }, [data]);

  const noData = !loading && records.length === 0;
  const isEditing = Boolean(editItem?.id);

  const openCreateModal = () => {
    setEditItem({ type: "new" });
    setFormData(emptyForm);
  };

  const openEditModal = (item) => {
    setEditItem(item);
    setFormData({
      ...emptyForm,
      ...fieldConfig.reduce((acc, field) => {
        acc[field.key] = item[field.key] || "";
        return acc;
      }, {}),
      description: item.description || "",
      id: item.id,
    });
  };

  const closeModal = () => {
    if (saving) return;
    setEditItem(null);
    setFormData(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Reminder name is required");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
      };

      const response = await apiRequest({
        endpoint: `${getBaseEndpoint(crmEndpoint)}?entryPoint=get_post_all`,
        method: "POST",
        params: { action_type: "post_data" },
        body: {
          parent_bean: {
            module: MODULE_NAME,
            ...payload,
          },
        },
        headers: apiHeaders,
      });

      if (response?.success === false) {
        throw new Error(response?.message || "Unable to save reminder");
      }

      toast.success(
        isEditing
          ? "Reminder updated successfully"
          : "Reminder created successfully",
      );
      closeModal();
      refetch();
    } catch (err) {
      toast.error(err?.message || "Unable to save reminder");
    } finally {
      setSaving(false);
    }
  };

const handleDelete = async (item) => {
  const reminderName = item.name || "this reminder";

  if (!window.confirm(`Are you sure you want to delete ${reminderName}?`)) {
    return;
  }

  setDeletingId(item.id);

  try {
    const response = await fetchGpc({
      method: "POST",
      params: {
        type: "delete_record",
        module_name: MODULE_NAME,
        record_id: item.id,
      },
    });

    if (response?.success === false) {
      throw new Error(response?.message || "Unable to delete reminder");
    }

    setData((prev) =>
      Array.isArray(prev)
        ? prev.filter((record) => record.id !== item.id)
        : prev,
    );

    toast.success("Reminder deleted successfully");
  } catch (err) {
    toast.error(err?.message || "Unable to delete reminder");
  } finally {
    setDeletingId(null);
  }
};

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">
              Reminder Management
            </h1>
          </div>
          <p className="mt-1 text-slate-500">Manage and monitor all reminders</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
        </button>

      </div>

      {loading && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="grid grid-cols-7 gap-4 border-b border-slate-100 p-4 last:border-b-0"
            >
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="h-5 animate-pulse rounded bg-slate-200"
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
          <p className="font-semibold">Unable to load reminders</p>
          <p className="mt-1 text-sm">{error.message}</p>
          <button
            onClick={refetch}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {noData && !error && (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
          <SearchX className="mx-auto mb-4 h-14 w-14 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-800">
            No Reminders Found
          </h2>
          <p className="mt-2 text-slate-500">Create your first reminder.</p>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead className="border-b bg-blue-600 text-white">
              <tr>
                <th className="p-4 font-semibold">Created Date</th>
                <th className="p-4 font-semibold">Reminder Name</th>
                <th className="p-4 font-semibold">Event</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Interval</th>
                <th className="p-4 font-semibold">Priority</th>
                <th className="p-4 font-semibold">Delay</th>
                <th className="p-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {records.map((item, index) => (
                <MotionTr
                  key={item.id || index}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  className="border-b border-slate-100 transition hover:bg-slate-50"
                >
                    <td className="p-4 text-slate-700">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      <span>
                        {item.date_entered
                          ? new Date(item.date_entered).toLocaleString()
                          : "-"}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-[220px] truncate p-4 font-medium text-slate-900">
                    {item.name || "-"}
                  </td>
                  <td className="max-w-[180px] truncate p-4 text-slate-700">
                    {item.event || "-"}
                  </td>
                  <td className="p-4 text-slate-700">
                    {item.reminder_type || "-"}
                  </td>
                  <td className="p-4 text-slate-700">
                    {item.interval_type_c || "-"}
                  </td>
                  <td className="p-4 text-slate-700">
                    {item.priority_c || "-"}
                  </td>
                  <td className="p-4 text-slate-700">{item.delay_c || "-"}</td>
                  
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingId === item.id }
                      </button>
                    </div>
                  </td>
                </MotionTr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {isEditing ? "Edit Reminder" : "Create Reminder"}
                </h2>
                <p className="text-sm text-slate-500">
                  {isEditing
                    ? "Update this reminder management record."
                    : "Create a new reminder management record."}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                {fieldConfig.map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      {field.label}
                      {field.required ? " *" : ""}
                    </span>
                    <input
                      name={field.key}
                      value={formData[field.key] || ""}
                      onChange={handleChange}
                      required={field.required}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                ))}
              </div>

              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </span>
                <textarea
                  name="description"
                  value={formData.description || ""}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving" : "Save Reminder"}
                </button>
              </div>
            </form>
          </MotionDiv>
        </div>
      )}
    </div>
  );
};

export default ReminderManagementPage;
