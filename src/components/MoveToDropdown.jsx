import React, { useState, useEffect, useRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { SocketContext } from "../context/SocketContext";

const MoveToDropdown = ({ currentThreadId, onMoveSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const { getMoveOptions, moveData } = useContext(SocketContext);
  const [moveLoading, setMoveLoading] = useState(null);
  const dropdownRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch labels when dropdown opens
  const fetchLabels = async () => {
    setLoading(true);
    try {
      const response = await getMoveOptions();
      if (response.success && response.labels) {
        setLabels(response.labels);
      } else {
        toast.error("Failed to fetch labels");
      }
    } catch (error) {
      toast.error("Error fetching labels");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDropdownToggle = () => {
    if (!isOpen) {
      fetchLabels();
    }
    setIsOpen(!isOpen);
  };

  const handleMoveClick = async (labelId, labelName) => {
    if (!currentThreadId) {
      toast.error("No thread selected");
      console.error("❌ ERROR: No thread ID available");
      return;
    }

    setMoveLoading(labelId);
    try {
      await moveData(currentThreadId, labelId);

      toast.success(`Moved to ${labelName} successfully!`);
      onMoveSuccess?.();
      setIsOpen(false);
    } catch (error) {
      // DEBUG: Error case
      console.error("❌ Move failed:", error);
      toast.error("Failed to move data");
    } finally {
      setMoveLoading(null);
    }
  };


  return (
    <div className="relative" ref={dropdownRef}>
      {/* Move To Button */}
      <button
        onClick={handleDropdownToggle}
        className="relative group flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg active:scale-95 hover:-translate-y-1 transition-all cursor-pointer"
      >
        <img
          src="https://img.icons8.com/color/48/resize-four-directions.png"
          className="w-6 h-6"
          alt="move to"
        />

        {/* Tooltip */}
        <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-lg z-20">
          Move To
        </span>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Move To Folder</h3>
                <span className="text-blue-100 text-xs bg-blue-500 px-2 py-1 rounded-full">
                  {labels.length} labels
                </span>
              </div>
              <p className="text-blue-100 text-xs mt-1">
                Select destination folder
              </p>
            </div>

            {/* Labels List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading labels...</span>
                </div>
              ) : labels.length > 0 ? (
                labels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => handleMoveClick(label.id, label.name)}
                    disabled={moveLoading === label.id}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {label.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-2">
                      {moveLoading === label.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <div className="w-2 h-2 bg-gray-300 rounded-full group-hover:bg-blue-500 transition-colors"></div>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <img
                    src="https://img.icons8.com/color/48/folder--v1.png"
                    className="w-12 h-12 mx-auto mb-2 opacity-50"
                    alt="no folders"
                  />
                  No folders available
                </div>
              )}
            </div>

            {/* Footer - Updated with better thread ID display */}
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-600 hover:text-gray-800 transition-colors cursor-pointer px-3 py-1 bg-white border border-gray-300 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MoveToDropdown;
