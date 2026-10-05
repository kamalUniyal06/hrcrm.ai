import { useEffect, useRef, useState } from "react";
import { changedProperties } from "@/utils/tablePresentationUpdate";

// Drafts survive item, section and view switches. Server refreshes from a drag
// must never erase an unfinished edit.
export default function usePresentationDrafts(editor, moduleKey, viewKey) {
  const [drafts, setDrafts] = useState({});
  const activeView = useRef([moduleKey, viewKey]);

  useEffect(() => {
    const [previousModule, previousView] = activeView.current;

    if (previousModule === moduleKey && previousView === viewKey) {
      return;
    }

    setDrafts((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => {
          const [draftModule, draftView] = JSON.parse(key);
          return draftModule !== previousModule || draftView !== previousView;
        }),
      ),
    );
    activeView.current = [moduleKey, viewKey];
  }, [moduleKey, viewKey]);

  const keyFor = (kind, id) => JSON.stringify([moduleKey, viewKey, kind, id]);
  const patch = (kind, id, changes) => {
    if (editor.writing) return;
    const key = keyFor(kind, id);
    setDrafts((current) => ({ ...current, [key]: { ...current[key], ...changes } }));
  };
  const decorate = (kind, item) => {
    const id = kind === "column" ? item.accessor : item.key;
    const changes = changedProperties(item, drafts[keyFor(kind, id)]);
    return { ...item, ...changes, dirty: Object.keys(changes).length > 0 };
  };
  const activeEntries = Object.entries(drafts).filter(([key]) => {
    const [draftModule, draftView] = JSON.parse(key);
    return draftModule === moduleKey && draftView === viewKey;
  });
  const dirty = activeEntries.some(([key, draft]) => {
    const [, , kind, id] = JSON.parse(key);
    const source = kind === "column"
      ? editor.columns.find((item) => item.accessor === id)
      : editor.statuses.find((item) => item.key === id);
    return Object.keys(changedProperties(source, draft)).length > 0;
  });
  const stageAll = async () => {
    for (const [key, draft] of activeEntries) {
      const [, , kind, id] = JSON.parse(key);
      const source = kind === "column"
        ? editor.columns.find((item) => item.accessor === id)
        : editor.statuses.find((item) => item.key === id);
      const changes = changedProperties(source, draft);

      if (
        Object.keys(changes).length &&
        !(await editor.updatePresentation(kind, id, changes))
      ) {
        return false;
      }
    }

    setDrafts((current) => {
      const next = { ...current };
      activeEntries.forEach(([key]) => delete next[key]);
      return next;
    });

    return true;
  };
  const repair = async () => {
    if (!(await stageAll())) return false;
    return editor.repair();
  };
  const resetAll = () => {
    setDrafts((current) => {
      const next = { ...current };
      activeEntries.forEach(([key]) => delete next[key]);
      return next;
    });
  };
  return {
    columns: editor.columns.map((item) => decorate("column", item)),
    statuses: editor.statuses.map((item) => decorate("status", item)),
    patch, resetAll, repair, dirty,
  };
}
