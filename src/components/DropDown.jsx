import { ChevronDown } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";

const DropDown = ({ options, handleSelectOption, timeline }) => {
  const [open, setOpen] = useState(false);
  const dropRef = useRef();

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get selected option
  const selectedOption =
    options.find((option) => option.period === timeline) || options[0];

  // Format date in "DD MMM YY" format (16 Dec 25)
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} ${year}`;
  };

  // Get date range based on period
  const getDateRange = (period) => {
    const today = new Date();
    let startDate = new Date(today);

    switch (period) {
      case "today":
        return {
          start: formatDate(today),
          end: formatDate(today),
          display: formatDate(today),
        };

      case "yesterday":
        startDate.setDate(today.getDate() - 1);
        return {
          start: formatDate(startDate),
          end: formatDate(startDate),
          display: formatDate(startDate),
        };

      case "this_week":
        // Get start of week (Monday)
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(today.getDate() - diffToMonday);
        return {
          start: formatDate(startOfWeek),
          end: formatDate(today),
          display: `${formatDate(startOfWeek)} - ${formatDate(today)}`,
        };

      case "last_7_days":
        startDate.setDate(today.getDate() - 6);
        return {
          start: formatDate(startDate),
          end: formatDate(today),
          display: `${formatDate(startDate)} - ${formatDate(today)}`,
        };

      case "last_30_days":
        startDate.setDate(today.getDate() - 29);
        return {
          start: formatDate(startDate),
          end: formatDate(today),
          display: `${formatDate(startDate)} - ${formatDate(today)}`,
        };

      case "this_month":
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: formatDate(startOfMonth),
          end: formatDate(today),
          display: `${formatDate(startOfMonth)} - ${formatDate(today)}`,
        };

      case "last_month": {
        const startOfLastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        );

        const endOfLastMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          0,
        );

        return {
          start: formatDate(startOfLastMonth),
          end: formatDate(endOfLastMonth),
          display: `${formatDate(startOfLastMonth)} - ${formatDate(endOfLastMonth)}`,
        };
      }

      case "last_3_months": {
        const startOfThreeMonths = new Date(
          today.getFullYear(),
          today.getMonth() - 2,
          1,
        );

        const endOfLastMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          0,
        );

        return {
          start: formatDate(startOfThreeMonths),
          end: formatDate(endOfLastMonth),
          display: `${formatDate(startOfThreeMonths)} - ${formatDate(endOfLastMonth)}`,
        };
      }

      default:
        return {
          start: "",
          end: "",
        };
    }
  };

  // Get date range for selected option
  const selectedDateRange = getDateRange(timeline || "today");

  return (
    <div className="relative cursor-pointer" ref={dropRef}>
      {/* Trigger Button - Fixed width to match screenshot */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(!open)}
        //   className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-gray-300
        //              rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200
        //              w-[200px] text-left"
        // >
        className="
  flex items-center justify-between gap-2
  px-4 py-2.5 w-[200px] text-left
  bg-white border border-gray-300 rounded-lg
  transition-all duration-200

  hover:bg-gray-50
  hover:border-blue-500

  focus:outline-none
  focus:border-blue-600
  focus:ring-2 focus:ring-blue-500/30

  active:border-blue-600
"
      >
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 truncate">
            {selectedOption?.title || "Select"}
          </span>
          {selectedOption?.title !== "All" && (
            <span className="text-xs text-gray-600 truncate">
              {selectedDateRange.display}
            </span>
          )}
        </div>

        {/* Arrow Rotation Animation */}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 ml-2"
        >
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu - Exact width and styling */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-1 w-[280px] bg-white border border-gray-300 
                       rounded-lg shadow-lg overflow-hidden z-50"
          >
            {/* Header */}
            {/* <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">
                Time period
              </h3>
            </div> */}

            {/* Options List */}
            <div className="max-h-80 overflow-y-auto">
              {options.map((option) => {
                const dateRange = getDateRange(option.period);
                const isSelected = timeline === option.period;
                const showDateRange = !["This year", "This quarter"].includes(
                  option.title,
                );

                return (
                  <motion.div
                    key={option.period}
                    whileHover={{ backgroundColor: "#b4b5b6ff" }}
                    onClick={() => {
                      setOpen(false);
                      handleSelectOption(option.period);
                    }}
                    className={`px-4 py-3 cursor-pointer transition-colors duration-150
                               ${isSelected ? "bg-blue-50" : ""}
                               hover:bg-gray-50`}
                  >
                    <div className="flex flex-col">
                      <div className="flex justify-between items-start">
                        <span
                          className={`text-sm font-medium ${
                            isSelected ? "text-blue-600" : "text-gray-900"
                          }`}
                        >
                          {option.title}
                        </span>
                        {!showDateRange && (
                          <span className="text-xs text-gray-500 italic">
                            {option.title}
                          </span>
                        )}
                      </div>

                      {showDateRange ? (
                        <span className="text-xs text-gray-600 mt-1">
                          {dateRange.display}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic mt-1">
                          {dateRange.start} - {dateRange.end}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DropDown;
