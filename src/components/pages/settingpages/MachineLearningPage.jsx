import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";

import Header from "./Header";
import Loading from "../../Loading";
import ErrorBox from "./ErrorBox";
import EditModal from "./EditModal";

import { useLocation, useNavigate } from "react-router-dom";
import { CREATE_DEAL_API_KEY } from "../../../store/constants";
import { apiRequest, fetchGpc } from "../../../services/api";
import { Edit3, Plus, X, Copy, CopyPlusIcon } from "lucide-react";

export function MachineLearningPage() {
  const { crmEndpoint } = useSelector((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();

  const promptId = location.state?.promptId;
  const promptStatus = location.state?.promptStatus;
  console.log("PROMPT", promptStatus)

  const [stages, setStages] = useState({});
  const [activeStage, setActiveStage] = useState("");
  const [motiveList, setMotiveList] = useState([]);
  const [motiveListLoading, setMotiveListLoading] = useState(false);

  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(false);

  // ✅ SEPARATE CREATE LOADING
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState(null);

  const [editItem, setEditItem] = useState(null);

  // ✅ CREATE MODAL
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ✅ TOAST
  const [toast, setToast] = useState(null);

  // ✅ CREATE FORM
  const initialForm = useMemo(
    () => ({
      name: "",
      motive: "",
      type: "",
      stage: "",
      description: "",
    }),
    [],
  );

  const [createForm, setCreateForm] = useState(initialForm);

  const handleCreateMotiveChange = (motive) => {
    const selectedMotive = motiveList.find((item) => item.motive === motive);

    setCreateForm((prev) => ({
      ...prev,
      motive,
      description: selectedMotive?.description || prev.description,
    }));
  };

  // =========================================================
  // ✅ TOAST HELPER
  // =========================================================
  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };
  // =========================================================
  // ✅ DUPLICATE PROMPT
  // =========================================================
  const handleDuplicate = async (item) => {
    try {
      setCreating(true);

      // =====================================================
      // DATE + TIME
      // =====================================================
      const now = new Date();

      const formattedDate = now
        .toISOString()
        .split("T")[0];

      const formattedTime = now
        .toTimeString()
        .split(" ")[0]
        .replace(/:/g, "-");

      // =====================================================
      // NEW DUPLICATE NAME
      // Example:
      // SEO_PROMPT_2026-05-25_14-32-10
      // =====================================================
      const duplicatedName = `${item.name}_${formattedDate}_${formattedTime}`;

      // =====================================================
      // PAYLOAD
      // =====================================================
      const payload = {
        parent_bean: {
          module: "outr_machine_learning",

          // NEW NAME
          name: duplicatedName,

          // COPY ALL VALUES
          motive: item.motive,
          type: item.type,
          stage: item.stage,
          description: item.description,

          role_prompt:
            item.role_prompt || "",

          output_format:
            item.output_format || "",

          overwrite_prompt:
            item.overwrite_prompt || "",
        },
      };

      // =====================================================
      // API REQUEST
      // =====================================================
      const data = await apiRequest({
        endpoint: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all`,

        params: {
          action_type: "post_data",
        },

        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-api-key":
            CREATE_DEAL_API_KEY,
        },

        body: JSON.stringify(payload),
      });

      console.log(
        "DUPLICATE RESPONSE",
        data
      );

      // =====================================================
      // SUCCESS
      // =====================================================
      if (
        data?.parent_updated ||
        data?.success
      ) {
        showToast(
          "Prompt duplicated successfully"
        );

        // REFRESH TABLE
        await fetchStageData(activeStage);
      } else {
        showToast(
          "Failed to duplicate prompt",
          "error"
        );
      }
    } catch (error) {
      console.error(error);

      showToast(
        "Duplicate failed",
        "error"
      );
    } finally {
      setCreating(false);
    }
  };
  // =========================================================
  // ✅ CREATE PROMPT
  // =========================================================
  const CreatePrompt = async () => {
    try {
      setCreating(true);
      setError(null);

      const payload = {
        stage: createForm.stage,
        motive: createForm.motive,
        type: createForm.type,
        name: createForm.name,

        // ✅ SEND ONLY USER INPUT
        user_input: createForm.description,
      };

      // =====================================================
      // ✅ AI PROMPT GENERATION
      // =====================================================
      const data = await fetchGpc({
        params: { type: "build_prompt" },
        method: "POST",
        body: payload,
      });

      console.log("CREATE PROMPT RESPONSE", data);

      const aiResponse = data?.response || {};

      // =====================================================
      // ✅ FIX MANUAL PROMPT ISSUE
      // =====================================================
      // Sometimes API returns the original user_input
      // inside overwrite_prompt / manual_prompt.
      // We remove it from both if duplicated.
      // =====================================================

      let overwritePrompt = aiResponse?.overwrite_prompt || "";

      if (
        overwritePrompt &&
        createForm.description &&
        overwritePrompt.includes(createForm.description)
      ) {
        overwritePrompt = overwritePrompt
          .replace(createForm.description, "")
          .trim();
      }

      // ✅ ALSO CLEAN manual_prompt
      let manualPrompt = aiResponse?.manual_prompt || "";

      if (
        manualPrompt &&
        createForm.description &&
        manualPrompt.includes(createForm.description)
      ) {
        manualPrompt = manualPrompt.replace(createForm.description, "").trim();
      }

      // =====================================================
      // ✅ SAVE INTO CRM
      // =====================================================
      const savePayload = {
        parent_bean: {
          module: "outr_machine_learning",

          name: createForm.name,
          motive: createForm.motive,
          type: createForm.type,
          stage: createForm.stage,
          description: manualPrompt,

          role_prompt: aiResponse.role_prompt || "",
          output_format: aiResponse.output_format || "",

          // ✅ CLEANED PROMPTS
          overwrite_prompt: overwritePrompt,
        },
      };

      const saveData = await apiRequest({
        endpoint: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all`,
        params: {
          action_type: "post_data",
        },
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CREATE_DEAL_API_KEY,
        },
        body: JSON.stringify(savePayload),
      });

      console.log("SAVE RESPONSE", saveData);

      // =====================================================
      // ✅ SUCCESS
      // =====================================================
      if (saveData?.parent_updated || saveData?.success) {
        showToast("Prompt created successfully");

        // ✅ CLOSE MODAL
        setShowCreateModal(false);

        // ✅ RESET FORM
        setCreateForm(initialForm);

        // ✅ OPEN CREATED STAGE
        setActiveStage(createForm.stage);

        // ✅ REFRESH TABLE
        await fetchStageData(createForm.stage);
      } else {
        showToast("Failed to create prompt", "error");
      }
    } catch (err) {
      console.error(err);

      setError(err);

      showToast(err?.message || "Failed To Create Prompt", "error");
    } finally {
      setCreating(false);
    }
  };

  // =========================================================
  // ✅ UPDATE
  // =========================================================
  const handleUpdate = async (updatedItem) => {
    try {
      setLoading(true);

      const payload = {
        parent_bean: {
          module: "outr_machine_learning",

          id: updatedItem.id,

          name: updatedItem.name,
          motive: updatedItem.motive,
          type: updatedItem.type,
          stage: updatedItem.stage,
          description: updatedItem.description || "",

          role_prompt: updatedItem.role_prompt,
          output_format: updatedItem.output_format,
          overwrite_prompt: updatedItem.overwrite_prompt,
        },
      };

      const data = await apiRequest({
        endpoint: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all`,
        params: {
          action_type: "post_data",
        },
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CREATE_DEAL_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (data.parent_updated) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === updatedItem.id
              ? {
                ...row,
                ...updatedItem,
              }
              : row,
          ),
        );

        showToast("Prompt updated successfully");

        return true;
      }

      showToast("Failed to update prompt", "error");

      return false;
    } catch (error) {
      console.error(error);

      showToast("Update failed", "error");

      return false;
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // ✅ FETCH STAGES
  // =========================================================
  const fetchStages = async () => {
    try {
      setLoading(true);

      const data = await fetchGpc({
        params: {
          type: "machine_learning",
          stage_type: 1,
        },
      });

      setStages(data || {});

      const firstKey = Object.keys(data || {})[0];

      // ✅ PRIORITY TO PROMPT STATUS
      if (promptStatus && data?.[promptStatus]) {
        setActiveStage(promptStatus);
      } else if (firstKey) {
        setActiveStage(firstKey);
      }
    } catch (err) {
      console.error(err);

      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // ✅ FETCH STAGE DATA
  // =========================================================
  const fetchStageData = async (stageKey) => {
    try {
      setLoading(true);

      const data = await fetchGpc({
        params: {
          type: "machine_learning",
          stage_type: stageKey,
        },
      });

      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMotives = async () => {
    try {
      setMotiveListLoading(true);

      const data = await fetchGpc({
        params: {
          type: "motive_list",
        },
      });

      setMotiveList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch motive list", err);

      showToast("Failed to load motives", "error");
    } finally {
      setMotiveListLoading(false);
    }
  };

  // =========================================================
  // EFFECTS
  // =========================================================
  useEffect(() => {
    fetchStages();
    fetchMotives();
  }, []);

  useEffect(() => {
    if (promptId && rows.length > 0) {
      const found = rows.find((r) => r.id === promptId);

      if (found) {
        setEditItem(found);
      }
    }
  }, [rows, promptId]);

  useEffect(() => {
    if (activeStage) {
      fetchStageData(activeStage);
    }
  }, [activeStage]);

  return (
    <div className="p-3 sm:p-6 lg:p-8 relative">
      <Header
        text="Machine Learning Manager"
        handleCreate={() => setShowCreateModal(true)}
      />

      {/* ===================================================== */}
      {/* TOAST */}
      {/* ===================================================== */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`fixed top-5 right-5 z-[100] px-5 py-4 rounded-xl shadow-xl text-white flex items-center gap-3
            ${toast.type === "error" ? "bg-red-600" : "bg-green-600"}`}
        >
          <span>{toast.message}</span>

          <button onClick={() => setToast(null)}>
            <X size={18} />
          </button>
        </motion.div>
      )}

      {/* ===================================================== */}
      {/* STAGES */}
      {/* ===================================================== */}
      <div className="flex flex-wrap gap-3 mt-6">
        {Object.entries(stages).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveStage(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition
              ${activeStage === key
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ===================================================== */}
      {/* PAGE LOADING */}
      {/* ===================================================== */}
      {loading && <Loading text="Machine Learning" />}

      {/* ===================================================== */}
      {/* ERROR */}
      {/* ===================================================== */}
      {error && <ErrorBox message={error.message} />}

      {/* ===================================================== */}
      {/* EMPTY */}
      {/* ===================================================== */}
      {!loading && rows.length === 0 && (
        <div className="mt-6 text-center p-10 bg-gray-50 border rounded-xl">
          No data found for this stage.
        </div>
      )}

      {/* ===================================================== */}
      {/* TABLE */}
      {/* ===================================================== */}
      {rows.length > 0 && (
        <div className="mt-8 overflow-x-auto bg-white shadow-md rounded-2xl border">
          <table className="w-full min-w-[820px] text-left border-collapse lg:min-w-0">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Motive</th>
                <th className="p-4">Type</th>
                <th className="p-4">Description</th>
                <th className="p-4">Stage</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.05,
                  }}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-4">{item.name}</td>

                  <td className="p-4">{item.motive}</td>

                  <td className="p-4">{item.type}</td>

                  <td className="p-4 max-w-[250px] line-clamp-2">
                    {item.description}
                  </td>

                  <td className="p-4">{item.stage}</td>

                  <td className="p-4">
                    <div className="flex items-center justify-end gap-3">

                      {/* DUPLICATE */}
                      <button
                        onClick={() =>
                          handleDuplicate(item)
                        }
                        className="
        flex items-center gap-2
        px-3 py-2
        bg-purple-600
        hover:bg-purple-700
        text-white
        rounded-lg
        transition-all
        duration-200
        shadow-sm
      "
                      >
                        <CopyPlusIcon size={16} />
                      </button>

                      {/* EDIT */}
                      <button
                        onClick={() => setEditItem(item)}
                        className="
        flex items-center gap-2
        px-3 py-2
        bg-blue-600
        hover:bg-blue-700
        text-white
        rounded-lg
        transition-all
        duration-200
        shadow-sm
      "
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================================================== */}
      {/* CREATE MODAL */}
      {/* ===================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-2xl relative">
            {/* CREATE LOADING OVERLAY */}
            {creating && (
              <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center rounded-2xl">
                <Loading text="Creating Prompt..." />
              </div>
            )}

            <h2 className="text-2xl font-semibold mb-6">Create AI Prompt</h2>

            <div className="grid grid-cols-3 gap-5">
              {/* NAME */}
              <div>
                <label className="block mb-2 text-sm font-medium">Name</label>

                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>

              {/* MOTIVE */}
              <div>
                <label className="block mb-2 text-sm font-medium">Motive</label>

                <select
                  value={createForm.motive}
                  onChange={(e) => handleCreateMotiveChange(e.target.value)}
                  disabled={motiveListLoading}
                  className="w-full border rounded-xl px-4 py-3"
                >
                  <option value="">
                    {motiveListLoading ? "Loading motives..." : "Select Motive"}
                  </option>
                  {motiveList.map((item, index) => (
                    <option key={`${item.motive}-${index}`} value={item.motive}>
                      {item.motive}
                    </option>
                  ))}
                </select>
              </div>

              {/* STAGE */}
              <div>
                <label className="block mb-2 text-sm font-medium">Stage</label>

                <select
                  value={createForm.stage}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      stage: e.target.value,
                    }))
                  }
                  className="w-full border rounded-xl px-4 py-3"
                >
                  <option value="">Select Stage</option>
                  {Object.entries(stages).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* DESCRIPTION */}
              <div className="col-span-3">
                <label className="block mb-2 text-sm font-medium">
                  Description
                </label>

                <textarea
                  rows={8}
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 mt-8">
              <button
                disabled={creating}
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-3 rounded-xl border disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                disabled={creating}
                onClick={CreatePrompt}
                className="px-5 py-3 rounded-xl bg-blue-600 text-white disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Prompt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* EDIT MODAL */}
      {/* ===================================================== */}
      <EditModal
        item={editItem}
        onClose={() => {
          setEditItem(null);

          if (promptId) navigate(-1);
        }}
        stages={stages}
        handleUpdate={handleUpdate}
      />
    </div>
  );
}
