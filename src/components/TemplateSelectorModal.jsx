// TemplateSelectorModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Edit, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { apiRequest } from "../services/api";
import { getCurrentUser } from "../services/utils";
import { useTemplatesByStage, useTemplateStages } from "../queries/template.queries";
import { LoadingChase } from "./Loading";

export default function TemplateSelectorModal({
  isOpen,
  onClose,
  onSelect,
  crmEndpoint,
  favourites,
  setFavourites,
}) {
  const navigate = useNavigate();
  const { data: stages, isLoading: stagesLoading, refetch: refetchStages } = useTemplateStages();
  const [stageType, setStageType] = useState("");
  const { isLoading: templateListLoading, data: templateList = [], refetch: refetchTemplates } = useTemplatesByStage(stageType);
  const assignUserId = useState(getCurrentUser()?.id ?? null);
  const [sortOption, setSortOption] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    if (!stagesLoading && stages && Object.keys(stages).length > 0) {
      setStageType(Object.keys(stages)[0]);
    }
  }, [stagesLoading, stages])



  // Template list per stage

  const filteredTemplates = useMemo(() => {
    if (!templateList?.length) return [];

    let list = [...templateList];

    // Sort
    list.sort((a, b) => {
      const dateA = new Date(a.date_modified || a.date_entered || 0);
      const dateB = new Date(b.date_modified || b.date_entered || 0);
      return sortOption === "newest" ? dateB - dateA : dateA - dateB;
    });

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();

      list = list.filter(
        (tpl) =>
          tpl.name?.toLowerCase().includes(term) ||
          tpl.description?.toLowerCase().includes(term),
      );
    }

    return list;
  }, [templateList, sortOption, searchTerm]);

  useEffect(() => {
    setSortOption("newest");
  }, [stageType]);

  const toggleFavourite = async (tpl) => {
    try {
      const baseUrl = crmEndpoint.split("?")[0];

      // If already favourited from backend OR local state
      if (tpl.is_favourite) {
        // Backend favourite → clicking again should CREATE again
        await apiRequest({ endpoint: `${baseUrl}?entryPoint=get_buttons`, params: { create_btn: 1, template_id: tpl.id, assigned_user_id: assignUserId || 1 } }
        );
      } else if (favourites[tpl.id]) {
        // Local favourite → delete
        const btnId = favourites[tpl.id];
        await apiRequest({ endpoint: `${baseUrl}?entryPoint=get_buttons`, params: { delete_btn: 1, btn_id: btnId } });
        setFavourites((prev) => {
          const updated = { ...prev };
          delete updated[tpl.id];
          return updated;
        });
      } else {
        // Create favourite
        const result = await apiRequest({
          endpoint: `${baseUrl}?entryPoint=get_buttons`, params: {
            create_btn: 1, template_id: tpl.id,
          }
        })
        setFavourites((prev) => ({
          ...prev,
          [tpl.id]: result?.btn_id || tpl.id,
        }));
      }

      refetchTemplates();
      await apiRequest({ endpoint: `${baseUrl}?entryPoint=get_buttons`, params: { assigned_user_id: assignUserId || 1 } });
    } catch (err) {
      console.error("Favourite error:", err);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full min-w-0 max-w-6xl max-h-[95vh] sm:max-h-[92vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex shrink-0 justify-between items-center gap-2 px-4 py-3 sm:px-8 sm:py-5 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl sm:rounded-t-3xl">
            <div className="min-w-0">
              <h3 className="truncate text-lg sm:text-2xl font-bold">Choose Email Template</h3>
              <p className="hidden text-indigo-100 text-sm mt-1 sm:block">
                Select a template to load into composer
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close template picker"
              className="shrink-0 p-2 sm:p-3 hover:bg-white/20 rounded-full transition"
            >
              <X className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          </div>

          {/* Stage Filters + Sort */}
          <div className="shrink-0 p-3 sm:p-6 border-b bg-gray-50 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            {stagesLoading ? (
              <div className="text-gray-500">Loading stages…</div>
            ) : (
              <div className="flex min-w-0 flex-wrap gap-2">
                {Object.entries(stages ?? {}).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setStageType(key)}
                    className={`px-3 py-2 text-sm sm:px-6 sm:py-2.5 sm:text-base rounded-2xl font-medium transition-all ${stageType === key
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-white border border-gray-300 hover:bg-gray-100 text-gray-700"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              {/* Search */}
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="min-w-0 flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-56 sm:flex-none"
              />

              {/* Sort */}
              <span className="hidden text-sm text-gray-500 font-medium sm:inline">
                Sort by:
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="shrink-0 px-3 py-2.5 sm:px-4 bg-white border border-gray-300 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-6 lg:p-8">
            {templateListLoading ? (
              <div className="flex justify-center py-20">
                <LoadingChase />
              </div>
            ) : filteredTemplates?.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 sm:gap-6">
                {filteredTemplates.map((tpl) => (
                  <motion.div
                    key={tpl.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -6 }}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 overflow-hidden transition-all group"
                  >
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition">
                        {tpl.name}
                      </h3>
                      <p className="mt-3 text-sm text-gray-600 line-clamp-3">
                        {tpl.description || "No description available"}
                      </p>
                      <div className="mt-3 text-xs text-gray-400 flex items-center gap-2">
                        Updated{" "}
                        <span className="font-mono">
                          {tpl.date_modified || tpl.date_entered}
                        </span>
                      </div>
                    </div>

                    <div className="px-6 pb-6 flex gap-3">
                      <button
                        onClick={() => {
                          onSelect(tpl);
                          onClose();
                        }}
                        className="flex-1 flex items-center justify-left gap-2 px-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg active:scale-98 transition-all"
                      >
                        <Mail size={19} />
                        Use This Template
                      </button>

                      {/* ⭐ Favourite Button */}
                      <button
                        onClick={() => toggleFavourite(tpl)}
                        className="p-3 border border-gray-300 hover:bg-gray-100 rounded-xl flex items-center"
                      >
                        <Heart
                          size={20}
                          className={`transition ${tpl.is_favourite || favourites[tpl.id]
                            ? "fill-red-500 text-red-500"
                            : "text-gray-500"
                            }`}
                        />
                      </button>

                      <button
                        onClick={() => {
                          navigate("/settings/templates", {
                            state: { templateId: tpl.id },
                          });
                        }}
                        className="p-3 border border-gray-300 hover:bg-gray-100 rounded-xl flex items-center"
                      >
                        <Edit size={20} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-xl text-gray-600">
                  No templates in this stage.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50 flex justify-between items-center rounded-b-3xl">
            <button
              onClick={() => {
                navigate("/settings/templates");
                onClose();
              }}
              className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2"
            >
              Manage All Templates →
            </button>
            <button
              onClick={onClose}
              className="px-8 py-3 text-gray-600 hover:bg-gray-100 rounded-2xl"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
