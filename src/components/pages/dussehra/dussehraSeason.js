// When the home header offers the Dussehra celebration (/dussehra), and whether
// its one-time invite is still due. Kept apart from the scene code so the home
// page doesn't load it.

// Vijayadashami, by IST date. Add each year's date here.
const DUSSEHRA_DATES = ["2026-10-20"];
const DAYS_BEFORE = 3;
const DAYS_AFTER = 3;
const DAY_MS = 86400000;
const INVITE_KEY = "dussehra-invite";

const istDateKey = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

// The festival date whose window `date` falls in, or null outside the season.
export function dussehraSeasonKey(date = new Date()) {
  const today = Date.parse(istDateKey(date));
  return (
    DUSSEHRA_DATES.find((day) => {
      const offset = (today - Date.parse(day)) / DAY_MS;
      return offset >= -DAYS_BEFORE && offset <= DAYS_AFTER;
    }) ?? null
  );
}

export const isDussehraSeason = (date = new Date()) => dussehraSeasonKey(date) !== null;

// The invite shows once per festival. Without storage it can't be remembered,
// so it isn't shown at all rather than on every visit.
export function dussehraInviteDue(date = new Date()) {
  const season = dussehraSeasonKey(date);
  if (!season) return false;
  try {
    return localStorage.getItem(INVITE_KEY) !== season;
  } catch {
    return false;
  }
}

export function rememberDussehraInvite(date = new Date()) {
  const season = dussehraSeasonKey(date);
  if (!season) return;
  try {
    localStorage.setItem(INVITE_KEY, season);
  } catch {
    // Private mode: nothing to remember it in.
  }
}
