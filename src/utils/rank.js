/**
 * Fractional rank ordering for Outright UI metadata.
 *
 * Every orderable Outright UI record stores its position in
 * a single opaque string:
 *
 *   database column   rank_key
 *   runtime API field rank
 *
 * Values look like `a0`, `a1`, `aZ`, `am`, `b0`. They are
 * case-sensitive ASCII and they are ONLY ever compared as
 * strings, byte for byte.
 *
 * Three rules this module exists to enforce:
 *
 *   1. Ranks are never numbers. No parseInt, no parseFloat,
 *      no subtraction, no numeric comparison.
 *
 *   2. Ranks are never compared with localeCompare. Locale
 *      collation reorders case and punctuation differently
 *      from the backend's binary ordering, so `aZ` vs `am`
 *      can come out backwards.
 *
 *   3. Ranks are never generated here. A move tells the
 *      backend which two records the moved record now sits
 *      between and the backend assigns the rank.
 *      See src/api/rank.api.js.
 *
 * A missing or duplicated rank inside a scope is invalid
 * migrated data, not something to paper over. Nothing in
 * this module falls back to `weight`, to zero, or to the
 * array index.
 */

/** Field name the runtime APIs expose. */
export const RANK_FIELD = "rank";

/** Column name the database and SmartGateway writes use. */
export const RANK_KEY_FIELD = "rank_key";

/**
 * Binary, code-point comparison. The single place any two
 * rank values are ordered.
 *
 * `<` and `>` on JS strings compare UTF-16 code units, which
 * for the ASCII alphabet the backend uses is the same order
 * as a byte comparison in MySQL/PHP.
 */
export function compareRankValues(left, right) {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

/**
 * A usable rank is a non-empty string. `0`, `null`, `""` and
 * numbers are all invalid - a numeric rank means something
 * upstream is still writing weights.
 */
export function isRankValue(value) {
  return typeof value === "string" && value.length > 0;
}

/** Stable record id as a string, for tie-breaks and reports. */
const idOf = (record) =>
  record?.id === null || record?.id === undefined ? "" : String(record.id);

/**
 * Ordering comparator for records already carrying `rank`.
 *
 * Duplicate ranks indicate stale/invalid data. The id
 * tie-break exists only so React renders something
 * deterministic while the scope is being reported and
 * reloaded - it is not a fallback ordering.
 */
export function compareRankedRecords(left, right) {
  const rankComparison = compareRankValues(left.rank, right.rank);

  if (rankComparison !== 0) {
    return rankComparison;
  }

  const leftId = idOf(left);
  const rightId = idOf(right);

  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}

/**
 * Copy a record coming off the wire into the shape React
 * state holds: `rank_key` becomes `rank`.
 *
 * `weight` is dropped deliberately. Keeping it around is how
 * a numeric ordering path creeps back in.
 */
export function toRankedRecord(record) {
  if (!record || typeof record !== "object") {
    return record;
  }

  const { [RANK_KEY_FIELD]: rankKey, weight: _weight, ...rest } = record;

  const rank = isRankValue(record[RANK_FIELD])
    ? record[RANK_FIELD]
    : isRankValue(rankKey)
      ? rankKey
      : null;

  return {
    ...rest,
    [RANK_FIELD]: rank,
  };
}

/**
 * Describe a scope for error messages and logs.
 *
 * Ranks are unique only inside a scope, so every report says
 * which scope it is talking about. Nothing in this module
 * ever compares ranks across two different scopes.
 */
export function describeScope(scope) {
  if (!scope) {
    return "unknown scope";
  }

  if (typeof scope === "string") {
    return scope;
  }

  const parts = [scope.collection || "collection"];

  Object.entries(scope)
    .filter(([key]) => key !== "collection" && key !== "label")
    .forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        parts.push(`${key}=${value}`);
      }
    });

  return scope.label || parts.join(" ");
}

/**
 * Look for the two things that make a scope unorderable:
 * a record with no rank, and two records sharing a rank.
 *
 * `unranked` is different from `missing`: it means NO record
 * in the collection carries a rank at all, so the collection
 * has not been migrated to ranks yet on the backend. There is
 * nothing to order by and nothing to repair, so callers keep
 * the backend's array order instead of raising a data error.
 */
export function inspectRankScope(items, scope) {
  const list = Array.isArray(items) ? items : [];

  const missing = [];
  const duplicates = [];
  const seen = new Map();

  list.forEach((item) => {
    const rank = item?.[RANK_FIELD];

    if (!isRankValue(rank)) {
      missing.push(idOf(item));
      return;
    }

    if (seen.has(rank)) {
      duplicates.push({
        rank,
        ids: [seen.get(rank), idOf(item)],
      });

      return;
    }

    seen.set(rank, idOf(item));
  });

  const rankedCount = list.length - missing.length;

  return {
    scope,
    scopeLabel: describeScope(scope),
    total: list.length,
    missing,
    duplicates,
    unranked: list.length > 0 && rankedCount === 0,
    valid: missing.length === 0 && duplicates.length === 0,
  };
}

/** Human-readable reason, for toasts and thrown errors. */
export function describeRankReport(report) {
  if (!report) {
    return "";
  }

  const reasons = [];

  if (report.missing.length) {
    reasons.push(
      `${report.missing.length} record(s) without a rank (${report.missing.join(", ")})`,
    );
  }

  if (report.duplicates.length) {
    reasons.push(
      `duplicate rank(s) ${report.duplicates
        .map((entry) => `${entry.rank} on ${entry.ids.join(" and ")}`)
        .join("; ")}`,
    );
  }

  if (!reasons.length) {
    return "";
  }

  return `Invalid rank data in ${report.scopeLabel}: ${reasons.join(", ")}.`;
}

/** Raised when a scope cannot be trusted to order or move. */
export class RankScopeError extends Error {
  constructor(report) {
    super(describeRankReport(report) || "Invalid rank data");

    this.name = "RankScopeError";
    this.report = report;
    this.scope = report?.scope;
  }
}

/**
 * Renderers re-run on every state change, and a rank problem
 * does not go away between renders. Log each distinct problem
 * once instead of once per paint.
 */
const reported = new Set();

const reportOnce = (key, log) => {
  if (reported.has(key)) {
    return;
  }

  reported.add(key);
  log();
};

/**
 * Sort an immutable copy. API response arrays and arrays held
 * in React state are never mutated in place.
 */
export function sortRankedRecords(items) {
  return [...items].sort(compareRankedRecords);
}

/**
 * Order one scope.
 *
 * The backend already returns records in rank order, so this
 * is a no-op for a clean response. It matters after local
 * reorders, optimistic cache writes and merged responses,
 * where the array order may no longer match the ranks.
 *
 * When the scope is invalid the ORIGINAL array order is
 * returned untouched and `report.valid` is false. No order is
 * invented for records the backend could not place; the
 * caller surfaces the error and reloads the scope.
 */
export function orderByRank(items, scope, { onInvalid } = {}) {
  const list = Array.isArray(items) ? items : [];

  const report = inspectRankScope(list, scope);

  if (report.unranked) {
    /*
     * Not an error: this collection has no ranks on the
     * backend yet. Warn so the gap is visible, and keep the
     * order the server sent. No order is invented, and
     * nothing falls back to weight or the array index.
     */
    reportOnce(`unranked:${report.scopeLabel}`, () =>
      console.warn(
        `[rank] ${report.scopeLabel} has no rank values; keeping backend array order`,
      ),
    );

    return { items: list, report };
  }

  if (!report.valid) {
    reportOnce(`invalid:${describeRankReport(report)}`, () =>
      console.error(`[rank] ${describeRankReport(report)}`, {
        scope: report.scope,
        missing: report.missing,
        duplicates: report.duplicates,
      }),
    );

    onInvalid?.(report);

    return { items: list, report };
  }

  return { items: sortRankedRecords(list), report };
}

/**
 * The neighbours surrounding the moved record, as record IDs.
 *
 * IDs, not ranks: the backend generates the rank from the two
 * neighbours it is given, so React only has to say where the
 * record landed.
 *
 * `reordered` is the destination scope already in its final
 * visual order, moved record included. The moved record is
 * removed before the neighbours are read, so it can never end
 * up as its own neighbour.
 *
 *   moved to the front  -> previousId ""
 *   moved to the end    -> nextId ""
 *   only record in scope -> both ""
 */
export function resolveMoveNeighborIds(reordered, movedId) {
  const list = Array.isArray(reordered) ? reordered : [];

  const target = String(movedId);

  const destinationIndex = list.findIndex((item) => idOf(item) === target);

  if (destinationIndex === -1) {
    return {
      destinationIndex: -1,
      previousId: "",
      nextId: "",
      siblings: list,
    };
  }

  /* Drop the moved record first. */
  const siblings = list.filter((item) => idOf(item) !== target);

  return {
    destinationIndex,

    previousId: idOf(siblings[destinationIndex - 1] ?? {}),
    nextId: idOf(siblings[destinationIndex] ?? {}),

    siblings,
  };
}

/**
 * Move `movedId` to `destinationIndex` in an immutable copy.
 * Pure array bookkeeping - no ranks are touched.
 */
export function reorderCopy(items, movedId, destinationIndex) {
  const list = [...(Array.isArray(items) ? items : [])];

  const target = String(movedId);

  const from = list.findIndex((item) => idOf(item) === target);

  if (from === -1) {
    return list;
  }

  const [moved] = list.splice(from, 1);

  const to = Math.max(0, Math.min(destinationIndex, list.length));

  list.splice(to, 0, moved);

  return list;
}

/*
 * There is deliberately no rank writer here.
 *
 * React never sets, derives or rebalances a rank value. A move
 * sends the two neighbour IDs and the backend does the rest,
 * inside its own transaction and lock. The optimistic array
 * order is what the UI shows until the next ordinary fetch
 * brings the authoritative rank_key values back.
 */
