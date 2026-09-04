import { Link } from "react-router-dom";
import useModule from "../../../hooks/useModule";
import { CREATE_DEAL_API_KEY } from "../../../store/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, Undo2, X } from "lucide-react";
import { useState } from "react";
import Loading from "../../Loading";
import Header from "./Header";
import ErrorBox from "./ErrorBox";
import EditBtn from "./EditBtn";
import { useSelector } from "react-redux";

export default function ButtonPage() {
  const [editItem, setEditItem] = useState(null);
  const { crmEndpoint } = useSelector((state) => state.user);

  const { loading, data, error, setData, refetch, add, update } = useModule({
    url: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all&action_type=get_data`,
    method: "POST",
    body: {
      module: "outr_btn_manager",
    },
    headers: {
      "x-api-key": `${CREATE_DEAL_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  const handleCreate = (updatedItem) => {
    setData((prev) => [{ id: Math.random(), ...updatedItem }, ...prev]);
    add({
      url: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all&action_type=get_data`,
      method: "POST",
      body: {
        parent_bean: {
          module: "outr_btn_manager",
          ...updatedItem,
        },
      },
      headers: {
        "x-api-key": `${CREATE_DEAL_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
  };
  const handleUpdate = (updatedItem) => {
    setData((prev) =>
      prev.map((obj) => (obj.id === updatedItem.id ? updatedItem : obj))
    );
    update({
      url: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all&action_type=get_data`,
      method: "POST",
      body: {
        parent_bean: {
          module: "outr_btn_manager",
          ...updatedItem,
        },
      },
      headers: {
        "x-api-key": `${CREATE_DEAL_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
  };
  return (
    <div className="p-3 sm:p-6 lg:p-8">
      {/* Header */}
      <Header
        text={"Button Manager"}
        handleCreate={() =>
          setEditItem(() => {
            return {
              type: "new",
            };
          })
        }
      />
      {/* Loading Skeleton */}
      {loading && <Loading text={"Button"} />}

      {/* Error Component */}
      {error && <ErrorBox message={error.message} onRetry={refetch} />}

      {/* Empty State */}
      {!loading && !error && !data && (
        <div className="mt-6 text-center p-10 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-gray-600 text-lg">No Button found.</p>
          <p className="text-gray-400 text-sm mt-1">
            Add new items from your backend or configuration panel.
          </p>
        </div>
      )}

      {/* Data Cards */}
      {/* Data Cards */}
      {data?.length > 0 && (
        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl 
                   border border-blue-200 p-5 flex flex-col 
                   justify-between group transition-all"
            >
              {/* Button Label */}
              <h2
                className="text-lg font-semibold text-gray-900 
                     group-hover:text-blue-600 transition"
              >
                {item.button_label || "Unnamed Button"}
              </h2>

              {/* Priority Badge */}
              <div className="mt-4">
                <span
                  className={`
              px-3 py-1 text-xs font-semibold rounded-full
              ${item.priority === "1"
                      ? "bg-green-100 text-green-700"
                      : item.priority === "2"
                        ? "bg-blue-100 text-blue-700"
                        : item.priority === "3"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                    }
            `}
                >
                  Priority: {item.priority}
                </span>
              </div>

              {/* Description */}
              {item.description && (
                <p className="mt-4 text-sm text-gray-700 line-clamp-3 group-hover:line-clamp-none transition-all">
                  {item.description}
                </p>
              )}

              {/* Edit Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setEditItem(item)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
                       rounded-xl shadow-sm hover:bg-blue-700 active:scale-95
                       transition-all"
                >
                  <Edit3 size={18} />
                  Edit
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <EditBtn
        item={editItem}
        onClose={() => setEditItem(null)}
        handleUpdate={handleUpdate}
        handleCreate={handleCreate}
      />
    </div>
  );
}
