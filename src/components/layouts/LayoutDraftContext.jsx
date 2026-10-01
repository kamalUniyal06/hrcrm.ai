import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useBlocker } from "react-router-dom";

const LayoutDraftContext = createContext(null);

const LEAVE_WARNING =
  "You have unapplied layout changes. Leave this page and discard them?";

export function LayoutDraftProvider({ children }) {
  const [dirtyEditors, setDirtyEditors] = useState({});
  const hasUnsavedChanges = Object.values(dirtyEditors).some(Boolean);

  const reportDirty = useCallback((editorId, dirty) => {
    setDirtyEditors((current) => {
      const next = { ...current };

      if (dirty) {
        next[editorId] = true;
      } else {
        delete next[editorId];
      }

      return next;
    });
  }, []);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges &&
      `${currentLocation.pathname}${currentLocation.search}` !==
      `${nextLocation.pathname}${nextLocation.search}`,
  );

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }

    if (window.confirm(LEAVE_WARNING)) {
      setDirtyEditors({});
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);

    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const value = useMemo(
    () => ({ hasUnsavedChanges, reportDirty }),
    [hasUnsavedChanges, reportDirty],
  );

  return (
    <LayoutDraftContext.Provider value={value}>
      {children}
    </LayoutDraftContext.Provider>
  );
}

// This colocated hook is the provider's small public API.
// eslint-disable-next-line react-refresh/only-export-components
export function useLayoutDraftGuard(editorId, dirty) {
  const context = useContext(LayoutDraftContext);
  const reportDirty = context?.reportDirty;

  useEffect(() => {
    reportDirty?.(editorId, Boolean(dirty));

    return () => reportDirty?.(editorId, false);
  }, [dirty, editorId, reportDirty]);
}
