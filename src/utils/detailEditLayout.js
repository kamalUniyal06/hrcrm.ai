import { inspectRankScope } from "./rank";
import { between, RighteeUiRank } from "./uiRank";

const clone = (value) =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

const esc = (value) =>
  String(value ?? "").replaceAll("~", "~0").replaceAll("/", "~1");

export const nodeKey = (node) =>
  String(node?.id ?? node?.accessor ?? node?.name ?? node?.label ?? "");

export const rankEntry = (node) => node?.presentation?.rank ?? null;

export function visibilityMutation(contract, node, rankPath, nextVisible) {
  const supplied = node?.presentation?.visible?.mutation;
  if (!supplied) {
    throw new Error("Flexibility did not return a visibility mutation for this item.");
  }
  const mutation = clone(supplied);
  mutation.data = { ...(mutation.data || {}) };
  mutation.data.value_boolean = Boolean(nextVisible);
  return mutation;
}

export function rankMutation(contract, node, path, nextRank) {
  const supplied = rankEntry(node)?.mutation;
  if (!supplied) {
    throw new Error("Flexibility did not return a rank mutation for this item.");
  }
  const mutation = clone(supplied);
  mutation.data = { ...(mutation.data || {}) };
  mutation.data.value_text = nextRank;
  return mutation;
}

export function childrenAt(layout, scope) {
  if (scope.type === "block") return layout.blocks || [];
  const block = (layout.blocks || []).find((item) => nodeKey(item) === scope.blockId);
  if (scope.type === "tab") return block?.tabs || [];
  const tab = (block?.tabs || []).find((item) => nodeKey(item) === scope.tabId);
  if (scope.type === "section") return tab?.sections || [];
  const section = (tab?.sections || []).find((item) => nodeKey(item) === scope.sectionId);
  return section?.fields || [];
}

export function scopePath(scope, item) {
  const block = `/blocks/${esc(scope.blockId)}`;
  if (scope.type === "block") return `/blocks/${esc(nodeKey(item))}/rank`;
  if (scope.type === "tab") return `${block}/tabs/${esc(nodeKey(item))}/rank`;
  const tab = `${block}/tabs/${esc(scope.tabId)}`;
  if (scope.type === "section") return `${tab}/sections/${esc(nodeKey(item))}/rank`;
  return `${tab}/sections/${esc(scope.sectionId)}/fields/${esc(nodeKey(item))}/rank`;
}

export function replaceChildren(layout, scope, children) {
  const next = clone(layout);
  if (scope.type === "block") {
    next.blocks = children;
    return next;
  }
  const block = (next.blocks || []).find((item) => nodeKey(item) === scope.blockId);
  if (scope.type === "tab") block.tabs = children;
  else {
    const tab = (block.tabs || []).find((item) => nodeKey(item) === scope.tabId);
    if (scope.type === "section") tab.sections = children;
    else {
      const section = (tab.sections || []).find((item) => nodeKey(item) === scope.sectionId);
      section.fields = children;
    }
  }
  return next;
}

export function replaceNode(layout, scope, itemId, changes) {
  const children = childrenAt(layout, scope).map((item) =>
    nodeKey(item) === itemId ? { ...item, ...changes } : item,
  );
  return replaceChildren(layout, scope, children);
}

export function planMove(layout, scope, activeId, overId) {
  const current = childrenAt(layout, scope);
  const destination = current.findIndex((item) => nodeKey(item) === overId);
  const moved = current.find((item) => nodeKey(item) === activeId);
  if (!moved || destination < 0 || activeId === overId) return null;

  const report = inspectRankScope(current, {
    collection: scope.type,
    label: `${scope.type}s in ${scope.sectionId || scope.tabId || scope.blockId || "view"}`,
  });
  if (!report.valid || report.unranked) throw new Error("This group has missing or duplicate ranks and cannot be reordered.");

  const reordered = [...current];
  const from = reordered.findIndex((item) => nodeKey(item) === activeId);
  const [active] = reordered.splice(from, 1);
  reordered.splice(Math.max(0, Math.min(destination, reordered.length)), 0, active);
  const landed = reordered.findIndex((item) => nodeKey(item) === activeId);
  const siblings = reordered.filter((item) => nodeKey(item) !== activeId);
  const { lower, upper } = RighteeUiRank.neighborRanksAt(siblings, landed);
  const nextRank = between(lower, upper);
  const ranked = reordered.map((item) =>
    nodeKey(item) === activeId ? { ...item, rank: nextRank } : item,
  );
  return { moved, nextRank, nextLayout: replaceChildren(layout, scope, ranked) };
}
