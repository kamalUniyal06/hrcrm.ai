import axios from "axios";

const prefix = "hrcrm.dailyActivity:";
const listeners = new Set();
let snapshot = { email: null, session: null, pending: false, error: null };
let inFlight = null;
export const subscribeActivity = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getActivitySnapshot = () => snapshot;
function publish(update) {
  snapshot = { ...snapshot, ...update };
  listeners.forEach((listener) => listener());
}
function read(email) {
  try { return JSON.parse(localStorage.getItem(prefix + email)) || null; }
  catch { return null; }
}
window.addEventListener("storage", (event) => {
  if (event.key === prefix + snapshot.email || event.key === null) {
    publish({ session: read(snapshot.email) });
  }
});

export async function recordActivity(email, action) {
  if (!email) throw new Error("Your signed-in email is unavailable.");
  if (inFlight) {
    await inFlight;
    return recordActivity(email, action);
  }
  const execute = async () => {
    const session = read(email);
    publish({ email, session, pending: true, error: null });
    try {
      if (action === "login" && session && session.action !== "logout") return session;
      if (action === "logout" && session?.action === "logout") return session;
      if (action === "lunch_in" && !["login", "lunch_out"].includes(session?.action)) throw new Error("Log in before starting lunch.");
      if (action === "lunch_out" && session?.action !== "lunch_in") throw new Error("Start lunch before ending it.");
      if (!["login", "logout", "lunch_in", "lunch_out"].includes(action)) throw new Error("Invalid activity action.");
      const { data } = await axios.post(
        "https://flight.hrcrm.ai/index.php?entryPoint=hrc&type=daily_activity",
        { email, action },
        { headers: { "x-api-key": import.meta.env.VITE_DAILY_ACTIVITY_API_KEY }, timeout: 20000 },
      );
      if (data?.success !== true || data.action !== action) throw new Error(data?.message || "Activity could not be saved.");
      // The API does not specify a timezone and lunch/logout timestamps are null.
      // Use the successful request's local time consistently for elapsed durations.
      const now = Date.now();
      const next = action === "login"
        ? { email, id: data.id, startedAt: now, lunchMs: 0, events: [] }
        : { ...session };
      if (session?.action === "lunch_in") next.lunchMs = (session.lunchMs || 0) + now - session.changedAt;
      Object.assign(next, { action, changedAt: now, events: [...(next.events || []), { action, at: now, serverDatetime: data.datetime }] });
      try { localStorage.setItem(prefix + email, JSON.stringify(next)); }
      catch { throw new Error("Activity saved, but browser storage is unavailable. Enable storage before continuing."); }
      publish({ session: next });
      return next;
    } catch (error) {
      publish({ error: error.response?.data?.message || error.message || "Activity request failed. Please retry." });
      throw error;
    } finally { publish({ pending: false }); }
  };
  inFlight = execute();
  try { return await inFlight; } finally { inFlight = null; }
}
