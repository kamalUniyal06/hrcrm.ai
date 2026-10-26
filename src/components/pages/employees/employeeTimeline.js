// Sample career events for the employee profile timeline. The backend doesn't record
// employee history yet, so these are placeholders anchored to the real joining date.

const pad = (value) => String(value).padStart(2, "0");
const dayKey = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

function parseDay(value) {
  const text = String(value ?? "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dmy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const [year, month, day] = iso ? [iso[1], iso[2], iso[3]] : dmy ? [dmy[3], dmy[2], dmy[1]] : [];
  if (!year) return null;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? null : date;
}

const shift = (start, { months = 0, days = 0 }) =>
  new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate() + days));

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

function timeSince(start, today) {
  let months = (today.getUTCFullYear() - start.getUTCFullYear()) * 12 + today.getUTCMonth() - start.getUTCMonth();
  if (today.getUTCDate() < start.getUTCDate()) months -= 1;
  if (months < 1) return "Less than a month";
  const years = Math.floor(months / 12);
  return [years && plural(years, "year"), months % 12 && plural(months % 12, "month")].filter(Boolean).join(" ");
}

const RAISES = [8, 10, 12, 9];

/**
 * Events from the first day to today, oldest first. Without a joining date the
 * timeline starts 18 months ago and `estimatedStart` is true.
 */
export function employeeTimeline({ joiningDate, designation = "", department = "" } = {}, now = new Date()) {
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const joined = parseDay(joiningDate);
  const start = joined && joined <= today ? joined : shift(today, { months: -18 });
  const role = String(designation).trim() || "a team member";
  const team = String(department).trim();

  const events = [
    { at: {}, kind: "join", title: "First day", detail: `Joined as ${role}${team ? ` in ${team}` : ""}.` },
    { at: {}, kind: "setup", title: "Workspace set up", detail: "Laptop, email and system access issued." },
    { at: { days: 7 }, kind: "onboarding", title: "Onboarding completed", detail: "Finished induction sessions and policy sign-offs." },
    { at: { months: 1 }, kind: "review", title: "First-month check-in", detail: "Goals for the first quarter agreed with the manager." },
    { at: { months: 3 }, kind: "training", title: "Training completed", detail: "Information security and workplace conduct courses." },
    { at: { months: 6 }, kind: "review", title: "Probation completed", detail: "Confirmed as a permanent employee." },
    { at: { months: 9 }, kind: "award", title: "Spot award", detail: "Recognised for delivering a key release ahead of schedule." },
  ];
  for (let year = 1; year <= 40; year += 1) {
    if (shift(start, { months: year * 12 }) > today) break;
    events.push(
      { at: { months: year * 12 }, kind: "anniversary", title: `${plural(year, "year")} with the company`, detail: "Work anniversary." },
      { at: { months: year * 12, days: 14 }, kind: "increment", title: "Annual appraisal", detail: `Rated "Exceeds expectations"; salary revised by ${RAISES[(year - 1) % RAISES.length]}%.` },
      { at: { months: year * 12 + 4 }, kind: "leave", title: "Planned leave", detail: "Took 5 days of annual leave." },
    );
  }

  const past = events
    .map((event, index) => ({ id: `${event.kind}-${index}`, date: dayKey(shift(start, event.at)), kind: event.kind, title: event.title, detail: event.detail }))
    .filter((event) => event.date <= dayKey(today))
    .sort((left, right) => left.date.localeCompare(right.date));
  past.push({ id: "today", date: dayKey(today), kind: "today", title: "Today", detail: `${timeSince(start, today)} with the company.` });
  return { events: past, estimatedStart: !joined || joined > today };
}
