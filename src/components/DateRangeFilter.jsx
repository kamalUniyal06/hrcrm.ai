import { useEffect, useRef, useState } from "react";
import {
  PRESETS,
  N_MINUTE_FILTERS,
  resolvePreset,
  resolveNMinutesRange,
  fmtDisplay,
  dtFromStrings,
  dtToStrings,
  fmtDtDisplay,
} from "../services/dateRangeUtils";
import { DateTimePicker } from "./DateTimePicker";
import { CalendarDays, ChevronDown, RefreshCcw, Clock } from "lucide-react";

export function DateRangeFilter({
  fromDate,
  fromTime,
  toDate,
  toTime,
  filterActive,
  onApply,
  onReset,
}) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [openPicker, setOpenPicker] = useState(null);
  const [lastNMinutes, setLastNMinutes] = useState(null); // null = All Day
  const [localFromDate, setLocalFromDate] = useState(fromDate);
  const [localFromTime, setLocalFromTime] = useState(fromTime);
  const [localToDate, setLocalToDate] = useState(toDate);
  const [localToTime, setLocalToTime] = useState(toTime);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
        setOpenPicker(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    setLocalFromDate(fromDate);
    setLocalFromTime(fromTime);
    setLocalToDate(toDate);
    setLocalToTime(toTime);
  }, [
    fromDate,
    fromTime,
    toDate,
    toTime,
  ]);
  function applyPreset(id) {
    const { from, ft, to, tt } = resolvePreset(id);
    setLocalFromDate(from);
    setLocalFromTime(ft);
    setLocalToDate(to);
    setLocalToTime(tt);
    setActivePreset(id);
    setOpenPicker(null);
    // Reset N-minutes filter when switching presets
    if (id !== "equals") {
      setLastNMinutes(null);
    }
  }

  function applyNMinutes(value) {
    setLastNMinutes(value);
    const today = resolvePreset("equals");
    const { ft, tt } = resolveNMinutesRange(value);
    setLocalFromDate(today.from);
    setLocalToDate(today.to);
    setLocalFromTime(ft);
    setLocalToTime(tt);
  }

  const activePresetLabel = PRESETS.find((p) => p.id === activePreset)?.label;
  const rangeLabel = filterActive
  ? `${fmtDisplay(localFromDate, localFromTime)} → ${fmtDisplay(localToDate, localToTime)}`
  : "Today, 00:00:00 → 23:59:59";

  const pickerFields = [
    {
      label: "From",
      key: "from",
      date: localFromDate,
      time: localFromTime,
      setDate: setLocalFromDate,
      setTime: setLocalFromTime,
      dh: 0,
      dm: 1,
    },
    {
      label: "To",
      key: "to",
      date: localToDate,
      time: localToTime,
      setDate: setLocalToDate,
      setTime: setLocalToTime,
      dh: 23,
      dm: 59,
    },
  ];

  // Summary text shown below the N-minutes buttons
  const nMinSummary = (() => {
    if (activePreset !== "equals") return null;
    if (!lastNMinutes) {
      return `Showing all activity for today (${localFromTime || "00:01"} → ${localToTime || "23:59"})`;
    }
    const found = N_MINUTE_FILTERS.find((f) => f.value === lastNMinutes);
    return `Showing activity for the ${found?.label?.toLowerCase() ?? ""} (${localFromTime} → ${localToTime})`;
  })();

  return (
    <div className="relative" ref={dropRef}>
      {/* Trigger */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-1.5 flex items-center gap-2 sm:px-5 sm:py-1 sm:gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <CalendarDays size={15} className="text-blue-700" />
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <div className="flex flex-col min-w-0">
            {activePresetLabel && (
              <span className="text-[9px] font-black text-blue-600 leading-none mb-0.5">
                {activePresetLabel}
              </span>
            )}
            <span
              className={`text-sm font-semibold truncate ${filterActive ? "text-gray-800" : "text-gray-400"}`}
            >
              {rangeLabel}
            </span>
          </div>
          <ChevronDown
            size={14}
            className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        <div className="flex flex-shrink-0 items-center gap-2">
          {filterActive && (
            <button
              onClick={() => {
                setActivePreset(null);
                setLastNMinutes(null);
                setOpen(false);
                onReset();
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-all cursor-pointer sm:px-3 sm:py-2"
            >
              <RefreshCcw size={11} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-[9999] w-[min(520px,calc(100vw_-_1.5rem))] max-h-[70vh] overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-2xl sm:max-h-none sm:overflow-visible"
        >
          <div
            className="flex flex-col rounded-t-2xl sm:flex-row"
            style={{ borderRadius: "16px 16px 0 0", overflow: "hidden" }}
          >
            {/* Preset sidebar */}
            <div className="w-full bg-gray-50 border-b border-gray-100 py-2 flex-shrink-0 sm:w-44 sm:border-b-0 sm:border-r">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-4 pt-2 pb-2">
                Quick Select
              </p>
              <div className="grid grid-cols-2 gap-1 px-2 pb-1 sm:grid-cols-1 sm:gap-0 sm:px-0 sm:pb-0">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs font-semibold transition-all rounded-lg sm:rounded-none sm:px-4 ${activePreset === p.id
                      ? "bg-blue-700 text-white"
                      : "text-gray-600 hover:bg-white hover:text-gray-900"
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 p-4 flex flex-col gap-4 min-w-0 sm:p-5">
              {/* Selected Period */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Selected Period
                </p>
                <div
                  className={`rounded-xl px-4 py-3 border ${activePresetLabel ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100"}`}
                >
                  <p className="text-sm font-bold text-blue-700">
                    {activePresetLabel || "Custom Range"}
                  </p>
                  {filterActive && (
                    <p className="text-xs text-blue-600 mt-0.5 font-medium">
                      {fmtDisplay(localFromDate, localFromTime)} →{" "}
                      {fmtDisplay(localToDate, localToTime)}
                    </p>
                  )}
                </div>
              </div>

              {/* N-Minutes filter — only for Today */}
              {activePreset === "equals" && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                    <Clock size={9} className="text-gray-400" />
                    Filter by Last N Minutes
                    <span className="normal-case font-medium text-gray-300 tracking-normal">
                      (optional)
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {N_MINUTE_FILTERS.map((f) => {
                      const isActive = lastNMinutes === f.value;
                      return (
                        <button
                          key={String(f.value)}
                          onClick={() => applyNMinutes(f.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${isActive
                            ? "bg-blue-700 text-white border-blue-700 shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                            }`}
                        >
                          {f.value !== null && (
                            <Clock
                              size={10}
                              className={
                                isActive ? "text-blue-200" : "text-gray-400"
                              }
                            />
                          )}
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                  {nMinSummary && (
                    <p className="text-[11px] text-gray-400 mt-2.5 font-medium">
                      {nMinSummary}
                    </p>
                  )}
                </div>
              )}

              {/* Between pickers */}
              {activePreset === "between" && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3">
                    {pickerFields.map(
                      ({
                        label,
                        key,
                        date,
                        time,
                        setDate,
                        setTime,
                        dh,
                        dm,
                      }) => (
                        <div key={key}>
                          <label className="text-[9px] font-black uppercase text-gray-400 mb-1.5 block">
                            {label}
                          </label>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenPicker(openPicker === key ? null : key);
                            }}
                            className={`w-full border rounded-xl px-3 py-2.5 text-xs font-semibold text-left transition-all ${openPicker === key
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                              }`}
                          >
                            {fmtDtDisplay(dtFromStrings(date, time))}
                          </button>
                          {openPicker === key && (
                            <div className="mt-2">
                              <DateTimePicker
                                value={dtFromStrings(date, time)}
                                onClose={() => setOpenPicker(null)}
                                onChange={(dt) => {
                                  const { date: d, time: t } = dtToStrings(dt);
                                  setDate(d);
                                  setTime(t);
                                  setActivePreset("between");
                                }}
                                defaultHour={dh}
                                defaultMin={dm}
                              />
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-700 font-semibold">
                    {fmtDisplay(localFromDate, localFromTime)} →{" "}
                    {fmtDisplay(localToDate, localToTime)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-5 py-3 flex justify-end gap-2 bg-gray-50 rounded-b-2xl">
            <button
              onClick={() => {
                setOpen(false);
                setOpenPicker(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setOpenPicker(null);
                onApply({
                  fromDate: localFromDate,
                  fromTime: localFromTime,
                  toDate: localToDate,
                  toTime: localToTime,
                });
              }}
              className="px-6 py-2 text-xs font-bold bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-all cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
