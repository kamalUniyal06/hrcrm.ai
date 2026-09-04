export const PRESETS = [
  { label: "Today", id: "equals" },
  { label: "Yesterday", id: "yesterday" },
  { label: "Last 7 Days", id: "last7" },
  { label: "Last 30 Days", id: "last30" },
  { label: "Last Month", id: "lastMonth" },
  { label: "Is Between", id: "between" },
];

export const N_MINUTE_FILTERS = [
  { label: "All Day", value: null },
  { label: "Last 1 min", value: 1 },
  { label: "Last 2 mins", value: 2 },
  { label: "Last 5 mins", value: 5 },
  { label: "Last 1 Hour", value: 60 },
  { label: "Last 2 Hours", value: 120 },
  { label: "Last 5 Hours", value: 300 },
];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const DAY_HDRS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const pad = (n) => String(n).padStart(2, "0");

export const fmt = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayStr = () => fmt(new Date());

export function fmtDisplay(dateStr, timeStr) {
  if (!dateStr) return "";
  try {
    return new Date(`${dateStr}T${timeStr || "00:00"}`).toLocaleString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    );
  } catch {
    return dateStr;
  }
}

export function resolvePreset(id) {
  const now = new Date();
  const y = now.getFullYear(),
    m = now.getMonth(),
    d = now.getDate();

  let from,
    ft = "00:00",
    to,
    tt = "23:59";

  switch (id) {
    case "equals":
      from = to = todayStr();
      ft = "00:01";
      break;
    case "yesterday":
      const yesterday = new Date(y, m, d - 1);
      from = fmt(yesterday);
      to = fmt(yesterday);
      break;
    case "last7":
      from = fmt(new Date(y, m, d - 7));
      to = todayStr();
      break;
    case "last30":
      from = fmt(new Date(y, m, d - 30));
      to = todayStr();
      break;
    case "lastMonth":
      from = fmt(new Date(y, m - 1, 1));
      to = fmt(new Date(y, m, 0));
      break;
    default:
      from = todayStr();
      to = fmt(new Date(y, m, d + 7));
  }

  return { from, ft, to, tt };
}

/**
 * Given a lastNMinutes value (or null for All Day), returns the effective
 * from/to time strings for "Today".
 */
export function resolveNMinutesRange(lastNMinutes) {
  if (!lastNMinutes) {
    return { ft: "00:01", tt: "23:59" };
  }
  const now = new Date();
  const toHour = now.getHours();
  const toMin = now.getMinutes();
  const fromMs = now.getTime() - lastNMinutes * 60 * 1000;
  const fromDate = new Date(fromMs);
  const fromHour = fromDate.getHours();
  const fromMin = fromDate.getMinutes();
  return {
    ft: `${pad(fromHour)}:${pad(fromMin)}`,
    tt: `${pad(toHour)}:${pad(toMin)}`,
  };
}

export function dtFromStrings(dateStr, timeStr) {
  if (!dateStr) return {};
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mn] = (timeStr || "00:00").split(":").map(Number);
  return { year: y, month: mo - 1, day: d, hour: h, min: mn };
}

export function dtToStrings(dt) {
  return {
    date: `${dt.year}-${pad(dt.month + 1)}-${pad(dt.day)}`,
    time: `${pad(dt.hour ?? 0)}:${pad(dt.min ?? 0)}`,
  };
}

export function fmtDtDisplay(dt) {
  if (!dt?.year) return "Select date";
  return `${pad(dt.day)} ${MONTH_SHORT[dt.month]} ${dt.year} ${pad(dt.hour ?? 0)}:${pad(dt.min ?? 0)}`;
}

export function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
