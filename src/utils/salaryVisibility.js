// Salary amounts are masked everywhere until someone presses the eye icon, which shows all of
// them at once (admins see everyone's they can access). The choice lasts for this page load only
// (memory, never storage).
//
// Every reveal goes through `requestSalaryAccess`. For now it always allows; this is where a
// per-user password check will go, so callers already wait for its answer.

export function createSalaryVisibility() {
  let showAll = false;
  const listeners = new Set();
  return {
    getShowAll: () => showAll,
    setShowAll(next) {
      showAll = Boolean(next);
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const salaryVisibility = createSalaryVisibility();

/** Resolves true when the viewer may see salary amounts. Later: ask for the user's password. */
export async function requestSalaryAccess() {
  return true;
}

export const MASKED_AMOUNT = "₹ ******";
