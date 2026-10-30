import { useSyncExternalStore } from "react";

// Each person's own Halloween-theme switch, kept in this browser. On by default;
// it stays off only for someone who has switched it off.
const KEY = "hrcrm:halloween-theme";
const EVENT = "hrcrm:halloween-theme-change";
let memory = true; // used when storage is blocked

const read = () => {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return memory;
  }
};

export function setHalloweenTheme(on) {
  memory = Boolean(on);
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* Storage blocked: the choice lasts until reload. */
  }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (callback) => {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback); // other tabs
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};

export const useHalloweenThemeOn = () => useSyncExternalStore(subscribe, read, () => true);
