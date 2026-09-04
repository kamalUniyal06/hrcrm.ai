/**
 * Fractional index ranks for Outright UI *presentation* properties.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS ALONGSIDE src/utils/rank.js
 * ---------------------------------------------------------------------------
 *
 * There are two completely different reordering contracts in this app and
 * they must not be mixed up:
 *
 *   1. Sidebar collections - outr_ui_groups and outr_ui_modules.
 *      React sends `rank_move_requested` plus the two neighbour record IDs
 *      and the BACKEND generates the rank. React must never invent a value.
 *      See src/utils/rank.js and src/api/rank.api.js.
 *
 *   2. View / column presentation - outr_ui_properties rows whose
 *      property_path ends in `/rank`.
 *      There is no positional-move flag for these. The Flexibility contract
 *      hands back a `rank` mutation with a `value_text` field, and the
 *      integration guide requires the CLIENT to calculate a rank between the
 *      destination neighbours using the same fractional-indexing algorithm
 *      as `RighteeUiRank::between`. That is what this module does.
 *
 * So: rank.js is "never generate", uiRank.js is "generate exactly the value
 * the backend would have generated". Keep them apart.
 *
 * ---------------------------------------------------------------------------
 * THE ALGORITHM
 * ---------------------------------------------------------------------------
 *
 * Ranks are variable-length, byte-comparable base62 strings, never numbers
 * and never array indexes. A key is an integer part (a length-prefixed
 * header char plus digits) optionally followed by a fraction:
 *
 *     a0    a1    a0V    a0V8    b00    Zz
 *
 * The header letter encodes how many digits follow, which is what keeps the
 * whole space lexicographically ordered as plain bytes:
 *
 *     'a'..'z'  ->  2..27 chars  (ascending magnitude)
 *     'A'..'Z'  ->  27..2 chars  (descending, used below 'a0')
 *
 * The documented canonical case, asserted by the tests below in comment form
 * and by src/utils/__rank_check, is:
 *
 *     between("a0", "a1") === "a0V"
 *
 * `V` is base62 digit 31, the midpoint of the 62-digit alphabet, appended to
 * the shared integer part `a0`. Nothing here parses a rank as a number.
 *
 * Ordering comparisons are always byte-for-byte via `compareRankValues` from
 * ./rank - never `localeCompare`, which collates case differently from the
 * backend and would order `aZ` and `am` backwards.
 */

import { compareRankValues, isRankValue } from "./rank";

/**
 * Digit alphabet, in byte order. '0' < '9' < 'A' < 'Z' < 'a' < 'z' in ASCII,
 * so a plain string comparison of two keys built from these digits gives the
 * same answer as the backend's binary comparison.
 */
export const BASE_62_DIGITS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** The smallest key generated when a scope is completely empty. */
export const FIRST_RANK = "a0";

/** Raised when a rank cannot be generated or a supplied rank is malformed. */
export class UiRankError extends Error {
  constructor(message, details = {}) {
    super(message);

    this.name = "UiRankError";
    Object.assign(this, details);
  }
}

/* =========================================================================
   INTEGER PART
   ========================================================================= */

/**
 * How many characters the integer part occupies, read from its header char.
 *
 * The two ranges are deliberately mirrored: 'a' is the shortest positive
 * header and 'Z' the shortest negative one, so keys below `a0` sort before it
 * as bytes without any sign handling.
 */
function integerLength(head) {
  if (head >= "a" && head <= "z") {
    return head.charCodeAt(0) - "a".charCodeAt(0) + 2;
  }

  if (head >= "A" && head <= "Z") {
    return "Z".charCodeAt(0) - head.charCodeAt(0) + 2;
  }

  throw new UiRankError(`invalid rank header character: ${JSON.stringify(head)}`, {
    head,
  });
}

/** Split the integer part off the front of a key. */
function integerPart(key) {
  const length = integerLength(key[0]);

  if (length > key.length) {
    throw new UiRankError(`invalid rank, integer part is truncated: ${key}`, {
      rank: key,
    });
  }

  return key.slice(0, length);
}

/** An integer part must be exactly as long as its header advertises. */
function assertInteger(integer) {
  if (integer.length !== integerLength(integer[0])) {
    throw new UiRankError(`invalid rank integer part: ${integer}`, { integer });
  }
}

/**
 * Reject keys the algorithm cannot work from.
 *
 * A trailing '0' in the fraction is invalid because it has no unique
 * predecessor, and `A` followed by 26 zeroes is the reserved lower bound.
 */
function assertRank(rank) {
  if (!isRankValue(rank)) {
    throw new UiRankError(
      `a rank must be a non-empty string, received ${JSON.stringify(rank)}`,
      { rank },
    );
  }

  if (rank === `A${"0".repeat(26)}`) {
    throw new UiRankError(`invalid rank, reserved lower bound: ${rank}`, {
      rank,
    });
  }

  const integer = integerPart(rank);
  const fraction = rank.slice(integer.length);

  assertInteger(integer);

  if (fraction.slice(-1) === "0") {
    throw new UiRankError(`invalid rank, trailing zero: ${rank}`, { rank });
  }

  for (const character of fraction) {
    if (BASE_62_DIGITS.indexOf(character) === -1) {
      throw new UiRankError(`invalid rank digit ${character} in ${rank}`, {
        rank,
      });
    }
  }

  return rank;
}

/** Public, non-throwing validity check. */
export function isValidRank(rank) {
  try {
    assertRank(rank);
    return true;
  } catch {
    return false;
  }
}

/** The next integer part after `integer`, or null at the top of the space. */
function incrementInteger(integer) {
  assertInteger(integer);

  const [head, ...digits] = integer.split("");

  let carry = true;

  for (let index = digits.length - 1; carry && index >= 0; index -= 1) {
    const next = BASE_62_DIGITS.indexOf(digits[index]) + 1;

    if (next === BASE_62_DIGITS.length) {
      digits[index] = "0";
    } else {
      digits[index] = BASE_62_DIGITS[next];
      carry = false;
    }
  }

  if (!carry) {
    return head + digits.join("");
  }

  /* Every digit rolled over, so the header has to grow. */
  if (head === "Z") {
    return "a0";
  }

  if (head === "z") {
    return null;
  }

  const nextHead = String.fromCharCode(head.charCodeAt(0) + 1);

  if (nextHead > "a") {
    digits.push("0");
  } else {
    digits.pop();
  }

  return nextHead + digits.join("");
}

/** The previous integer part before `integer`, or null at the bottom. */
function decrementInteger(integer) {
  assertInteger(integer);

  const [head, ...digits] = integer.split("");

  const lastDigit = BASE_62_DIGITS.slice(-1);

  let borrow = true;

  for (let index = digits.length - 1; borrow && index >= 0; index -= 1) {
    const next = BASE_62_DIGITS.indexOf(digits[index]) - 1;

    if (next === -1) {
      digits[index] = lastDigit;
    } else {
      digits[index] = BASE_62_DIGITS[next];
      borrow = false;
    }
  }

  if (!borrow) {
    return head + digits.join("");
  }

  if (head === "a") {
    return `Z${lastDigit}`;
  }

  if (head === "A") {
    return null;
  }

  const nextHead = String.fromCharCode(head.charCodeAt(0) - 1);

  if (nextHead < "Z") {
    digits.push(lastDigit);
  } else {
    digits.pop();
  }

  return nextHead + digits.join("");
}

/* =========================================================================
   FRACTION MIDPOINT
   ========================================================================= */

/**
 * A fraction strictly between two fractions of the SAME integer part.
 *
 * `upper` may be undefined, meaning "no upper bound inside this integer",
 * in which case the midpoint of the whole alphabet is used. This is the step
 * that turns ("", undefined) into "V" and therefore ("a0","a1") into "a0V".
 */
function midpoint(lower, upper) {
  if (upper !== undefined && lower >= upper) {
    throw new UiRankError(
      `cannot find a rank between ${lower} and ${upper}, they are out of order`,
      { lower, upper },
    );
  }

  if (lower.slice(-1) === "0" || (upper && upper.slice(-1) === "0")) {
    throw new UiRankError("cannot work from a fraction with a trailing zero", {
      lower,
      upper,
    });
  }

  if (upper) {
    /*
     * Keep the shared prefix and recurse on the remainder. `lower` is padded
     * with '0' while walking the prefix; `upper` never needs padding because
     * it cannot run out before `lower` does inside a common prefix.
     */
    let shared = 0;

    while ((lower[shared] || "0") === upper[shared]) {
      shared += 1;
    }

    if (shared > 0) {
      return (
        upper.slice(0, shared) +
        midpoint(lower.slice(shared), upper.slice(shared))
      );
    }
  }

  const lowerDigit = lower ? BASE_62_DIGITS.indexOf(lower[0]) : 0;

  const upperDigit =
    upper !== undefined ? BASE_62_DIGITS.indexOf(upper[0]) : BASE_62_DIGITS.length;

  if (upperDigit - lowerDigit > 1) {
    /* Room for a digit in between. */
    return BASE_62_DIGITS[Math.round(0.5 * (lowerDigit + upperDigit))];
  }

  /* Consecutive digits, so the key has to get one character longer. */
  if (upper && upper.length > 1) {
    return upper.slice(0, 1);
  }

  return BASE_62_DIGITS[lowerDigit] + midpoint(lower.slice(1), undefined);
}

/* =========================================================================
   PUBLIC API
   ========================================================================= */

/**
 * A rank strictly between `lower` and `upper`.
 *
 * Pass null/undefined/"" for either side to mean "no neighbour there":
 *
 *   between(null, null)   first rank in an empty scope     -> "a0"
 *   between("a0", null)   append after the last column     -> "a1"
 *   between(null, "a1")   prepend before the first column  -> "a0"
 *   between("a0", "a1")   drop between two neighbours      -> "a0V"
 *
 * Throws UiRankError when the two neighbours are equal or out of order,
 * which means the caller read them off an order the server has not accepted.
 * Nothing is guessed in that case; the caller refetches.
 */
export function between(lower, upper) {
  const low = isRankValue(lower) ? assertRank(lower) : null;
  const high = isRankValue(upper) ? assertRank(upper) : null;

  if (low !== null && high !== null && compareRankValues(low, high) >= 0) {
    throw new UiRankError(
      `cannot place a rank between ${low} and ${high}, the neighbours are not in ascending order`,
      { lower: low, upper: high },
    );
  }

  /* Empty scope. */
  if (low === null && high === null) {
    return FIRST_RANK;
  }

  /* Prepend: step down from the first neighbour. */
  if (low === null) {
    const integer = integerPart(high);
    const fraction = high.slice(integer.length);

    if (integer === `A${"0".repeat(26)}`) {
      return integer + midpoint("", fraction);
    }

    if (compareRankValues(integer, high) < 0) {
      return integer;
    }

    const previous = decrementInteger(integer);

    if (previous === null) {
      throw new UiRankError(
        `cannot place a rank before ${high}, the rank space below it is exhausted`,
        { upper: high, exhausted: true },
      );
    }

    return previous;
  }

  /* Append: step up from the last neighbour. */
  if (high === null) {
    const integer = integerPart(low);
    const fraction = low.slice(integer.length);

    const next = incrementInteger(integer);

    return next === null ? integer + midpoint(fraction, undefined) : next;
  }

  /* Between two neighbours. */
  const lowInteger = integerPart(low);
  const lowFraction = low.slice(lowInteger.length);

  const highInteger = integerPart(high);
  const highFraction = high.slice(highInteger.length);

  if (lowInteger === highInteger) {
    return lowInteger + midpoint(lowFraction, highFraction);
  }

  const next = incrementInteger(lowInteger);

  if (next === null) {
    throw new UiRankError(
      `cannot place a rank between ${low} and ${high}, the rank space above is exhausted`,
      { lower: low, upper: high, exhausted: true },
    );
  }

  if (compareRankValues(next, high) < 0) {
    return next;
  }

  return lowInteger + midpoint(lowFraction, undefined);
}

/**
 * `count` ranks in ascending order, all strictly between the two bounds.
 *
 * This is the rebalance path. When a single `between` cannot be placed the
 * integration guide says to generate a complete replacement sequence outside
 * the occupied interval and write every item in displayed order, rather than
 * moving one item into a space that does not exist.
 */
export function sequence(lower, upper, count) {
  if (!Number.isInteger(count) || count < 0) {
    throw new UiRankError(`a rank sequence needs a whole count, got ${count}`, {
      count,
    });
  }

  if (count === 0) {
    return [];
  }

  if (count === 1) {
    return [between(lower, upper)];
  }

  const low = isRankValue(lower) ? lower : null;
  const high = isRankValue(upper) ? upper : null;

  /* Open top: walk upwards, which never subdivides. */
  if (high === null) {
    let cursor = between(low, null);

    const ranks = [cursor];

    for (let index = 1; index < count; index += 1) {
      cursor = between(cursor, null);
      ranks.push(cursor);
    }

    return ranks;
  }

  /* Open bottom: walk downwards, then flip to ascending. */
  if (low === null) {
    let cursor = between(null, high);

    const ranks = [cursor];

    for (let index = 1; index < count; index += 1) {
      cursor = between(null, cursor);
      ranks.push(cursor);
    }

    return ranks.reverse();
  }

  /* Closed interval: split in the middle and recurse both halves. */
  const middleIndex = Math.floor(count / 2);

  const middle = between(low, high);

  return [
    ...sequence(low, middle, middleIndex),
    middle,
    ...sequence(middle, high, count - middleIndex - 1),
  ];
}

/**
 * A full ascending sequence placed entirely ABOVE every rank in `ranks`.
 *
 * Used when the occupied interval can no longer be subdivided: the whole
 * displayed order is rewritten into fresh space instead of trying to squeeze
 * one value in.
 */
export function rebalanceAbove(ranks, count) {
  const occupied = (Array.isArray(ranks) ? ranks : []).filter(isRankValue);

  const highest = occupied.length
    ? occupied.reduce((max, rank) => (compareRankValues(rank, max) > 0 ? rank : max))
    : null;

  return sequence(highest, null, count);
}

/**
 * The neighbouring ranks around `destinationIndex` in a list that does NOT
 * yet contain the moved item.
 *
 * Ranks, not IDs: presentation reordering sends a calculated `value_text`,
 * unlike the sidebar contract which sends neighbour IDs.
 */
export function neighborRanksAt(siblings, destinationIndex, rankOf = (item) => item?.rank) {
  const list = Array.isArray(siblings) ? siblings : [];

  const index = Math.max(0, Math.min(destinationIndex, list.length));

  return {
    lower: index > 0 ? rankOf(list[index - 1]) ?? null : null,
    upper: index < list.length ? rankOf(list[index]) ?? null : null,
  };
}

/**
 * Named export bundle, so call sites read the way the integration guide
 * describes the backend helper.
 */
export const RighteeUiRank = {
  between,
  sequence,
  rebalanceAbove,
  neighborRanksAt,
  isValidRank,
  FIRST_RANK,
  BASE_62_DIGITS,
};

export default RighteeUiRank;
