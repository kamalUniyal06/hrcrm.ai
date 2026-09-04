import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  X,
  ExternalLink,
  Calendar,
  User,
  Shield,
  TrendingUp,
  Clock,
  Globe,
  FileText,
  AlertCircle
} from "lucide-react";
import { useBacklink } from "../../queries/backlinks.queries";

export default function BacklinkDetailBox({ onClose, backlinkId }) {
  const dispatch = useDispatch();

  const { data: currentBacklink, isPending, error } = useBacklink(backlinkId);

  const [isEditing, setIsEditing] = useState(false);

  const [editData, setEditData] = useState({});



  useEffect(() => {
    if (currentBacklink) {
      setEditData({
        anchor_text_c: currentBacklink.anchor_text_c || "",
        status_c: currentBacklink.status_c || "",
        expiry_date_c: currentBacklink.expiry_date_c || "",
        target_url_c: currentBacklink.target_url_c || "",
      });
    }
  }, [currentBacklink]);

  const handleInputChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border border-green-200";
      case "removed":
        return "bg-red-100 text-red-700 border border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  if (isPending) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
        <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-2xl w-full max-w-5xl p-8">

          <div className="animate-pulse">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="h-8 w-64 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded"></div>
              </div>

              <div className="h-10 w-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-2 gap-6">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="bg-gray-100 dark:bg-[#1f2937] rounded-2xl p-5"
                >
                  <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-3"></div>

                  <div className="h-6 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
                </div>
              ))}
            </div>

            {/* URL Sections */}
            <div className="mt-6 space-y-4">
              <div className="h-20 bg-gray-100 dark:bg-[#1f2937] rounded-2xl"></div>

              <div className="h-20 bg-gray-100 dark:bg-[#1f2937] rounded-2xl"></div>
            </div>
          </div>

        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center">
            <AlertCircle className="w-14 h-14 text-yellow-500" />
          </div>

          <p className="text-center mt-5 text-gray-600 dark:text-gray-300 text-lg">
            Backlink details not found.
          </p>

          <button
            onClick={onClose}
            className="mt-6 w-full px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all duration-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto border border-gray-200 dark:border-gray-700">

        {/* HEADER */}
        <div className="flex items-center justify-between p-6 sticky top-0 bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-700 z-10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-green-100 dark:bg-green-900/30">
              <ExternalLink className="w-6 h-6 text-green-600" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
                {isEditing ? "Edit Backlink" : "Backlink Details"}
              </h2>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage and review backlink information
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all duration-200"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-300" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* LEFT */}
            <div className="space-y-5">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Basic Information
              </h3>

              {/* DOMAIN */}
              <div className="flex items-start gap-4 p-5 bg-gray-100 dark:bg-[#1f2937] rounded-2xl">
                <div className="p-2 rounded-xl bg-white dark:bg-[#111827] shadow-sm">
                  <Globe className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Domain
                  </p>

                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.target_url_c || ""}
                      onChange={(e) =>
                        handleInputChange("target_url_c", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#111827] rounded-xl outline-none text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="font-semibold text-gray-900 dark:text-white break-all">
                      {currentBacklink.name}
                    </p>
                  )}
                </div>
              </div>

              {/* ANCHOR */}
              <div className="flex items-start gap-4 p-5 bg-gray-100 dark:bg-[#1f2937] rounded-2xl">
                <div className="p-2 rounded-xl bg-white dark:bg-[#111827] shadow-sm">
                  <TrendingUp className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Anchor Text
                  </p>

                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.anchor_text_c || ""}
                      onChange={(e) =>
                        handleInputChange("anchor_text_c", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#111827] rounded-xl outline-none text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {currentBacklink.anchor_text_c || "N/A"}
                    </p>
                  )}
                </div>
              </div>

              {/* STATUS */}
              <div className="flex items-start gap-4 p-5 bg-gray-100 dark:bg-[#1f2937] rounded-2xl">
                <div className="p-2 rounded-xl bg-white dark:bg-[#111827] shadow-sm">
                  <Shield className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </p>

                  {isEditing ? (
                    <select
                      value={editData.status_c || ""}
                      onChange={(e) =>
                        handleInputChange("status_c", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#111827] rounded-xl outline-none text-gray-900 dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="removed">Removed</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        currentBacklink.status_c
                      )}`}
                    >
                      {currentBacklink.status_c?.toUpperCase() || "UNKNOWN"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-5">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </h3>

              {/* DATE */}
              <div className="flex items-start gap-4 p-5 bg-gray-100 dark:bg-[#1f2937] rounded-2xl">
                <div className="p-2 rounded-xl bg-white dark:bg-[#111827] shadow-sm">
                  <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Date Added
                  </p>

                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatDate(currentBacklink.date_entered)}
                  </p>
                </div>
              </div>

              {/* EXPIRY */}
              <div className="flex items-start gap-4 p-5 bg-gray-100 dark:bg-[#1f2937] rounded-2xl">
                <div className="p-2 rounded-xl bg-white dark:bg-[#111827] shadow-sm">
                  <Clock className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Expiry Date
                  </p>

                  {isEditing ? (
                    <input
                      type="date"
                      value={editData.expiry_date_c || ""}
                      onChange={(e) =>
                        handleInputChange("expiry_date_c", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#111827] rounded-xl outline-none text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatDate(currentBacklink.expiry_date_c)}
                    </p>
                  )}
                </div>
              </div>

              {/* AUTHOR */}
              <div className="flex items-start gap-4 p-5 bg-gray-100 dark:bg-[#1f2937] rounded-2xl">
                <div className="p-2 rounded-xl bg-white dark:bg-[#111827] shadow-sm">
                  <User className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Author
                  </p>

                  <p className="font-semibold text-gray-900 dark:text-white">
                    {currentBacklink.post_author_name_c || "N/A"}
                  </p>

                  <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
                    {currentBacklink.post_author_email_c}
                  </p>
                </div>
              </div>
            </div>

            {/* URL SECTION */}
            <div className="md:col-span-2 space-y-5">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                URLs
              </h3>

              {/* TARGET URL */}
              <div className="p-5 bg-gray-100 dark:bg-[#1f2937] rounded-2xl">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Target URL
                </p>

                <a
                  href={currentBacklink.target_url_c}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 hover:underline flex items-center gap-2 break-all font-medium"
                >
                  {currentBacklink.target_url_c}

                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                </a>
              </div>

              {/* SOURCE URL */}
              {currentBacklink.source_url_c && (
                <div className="p-5 bg-gray-100 dark:bg-[#1f2937] rounded-2xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Source URL
                  </p>

                  <a
                    href={currentBacklink.source_url_c}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-400 hover:underline flex items-center gap-2 break-all font-medium"
                  >
                    {currentBacklink.source_url_c}

                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 p-6 sticky bottom-0 bg-white dark:bg-[#111827] border-t border-gray-200 dark:border-gray-700 rounded-b-3xl">
          {isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
          )}

          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all duration-200 font-medium shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}