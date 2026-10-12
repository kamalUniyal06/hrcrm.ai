// Experience date-only values follow the CRM's DD/MM/YYYY convention.
// Keep calendar dates as strings so browser timezones cannot shift the day.
export function experienceDateForInput(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const isoDate = text.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T ]\d{2}:\d{2})/);
  const date = slashDate
    ? `${slashDate[3]}-${slashDate[2].padStart(2, "0")}-${slashDate[1].padStart(2, "0")}`
    : isoDate?.[1];
  if (!date) return text;
  const parsed = new Date(`${date}T00:00:00Z`);
  // Leave invalid backend values intact for the existing form validation.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    ? date
    : text;
}
