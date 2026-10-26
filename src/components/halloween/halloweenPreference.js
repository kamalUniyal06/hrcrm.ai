import { useSyncExternalStore } from "react";

// Each person's own Halloween-theme switch, kept in this browser. Off by default.
const KEY = "hrcrm:halloween-theme";
const EVENT = "hrcrm:halloween-theme-change";
let memory = false; // used when storage is blocked

const read = () => {
  try {
    return localStorage.getItem(KEY) === "on";
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

export const useHalloweenThemeOn = () => useSyncExternalStore(subscribe, read, () => false);
