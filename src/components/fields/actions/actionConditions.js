/**
 * Evaluate one simple condition.
 *
 * Example:
 *
 * {
 *   field: "order_status",
 *   operator: "neq",
 *   value: "completed"
 * }
 */
function evaluateSingleCondition(
    condition,
    record
) {
    const value =
        record?.[condition.field]?.toLowerCase();

    const expected =
        condition.value?.toLowerCase();

    switch (condition.operator) {
        case "eq":
            return value === expected;

        case "neq":
            return value !== expected;

        case "gt":
            return value > expected;

        case "gte":
            return value >= expected;

        case "lt":
            return value < expected;

        case "lte":
            return value <= expected;

        case "in":
            return (
                Array.isArray(expected) &&
                expected.includes(value)
            );

        case "not_in":
            return (
                Array.isArray(expected) &&
                !expected.includes(value)
            );

        case "contains":
            return String(value ?? "")
                .toLowerCase()
                .includes(
                    String(expected ?? "")
                        .toLowerCase()
                );

        case "not_contains":
            return !String(value ?? "")
                .toLowerCase()
                .includes(
                    String(expected ?? "")
                        .toLowerCase()
                );

        case "exists":
            return (
                value !== undefined &&
                value !== null
            );

        case "empty":
            return (
                value === undefined ||
                value === null ||
                value === ""
            );

        case "not_empty":
            return !(
                value === undefined ||
                value === null ||
                value === ""
            );

        default:
            console.warn(
                `Unknown condition operator: ${condition.operator}`
            );

            return true;
    }
}

/**
 * Evaluate nested conditions.
 *
 * Supports:
 *
 * {
 *   all: [...]
 * }
 *
 * {
 *   any: [...]
 * }
 */
export function evaluateCondition(
    condition,
    record
) {
    if (!condition) {
        return true;
    }

    // AND group
    if (Array.isArray(condition.all)) {
        return condition.all.every(
            (child) =>
                evaluateCondition(
                    child,
                    record
                )
        );
    }

    // OR group
    if (Array.isArray(condition.any)) {
        return condition.any.some(
            (child) =>
                evaluateCondition(
                    child,
                    record
                )
        );
    }

    return evaluateSingleCondition(
        condition,
        record
    );
}

/**
 * Visibility is always an array.
 *
 * Top-level conditions are AND.
 *
 * Example:
 *
 * visibility: [
 *   conditionA,
 *   conditionB
 * ]
 *
 * means:
 *
 * conditionA && conditionB
 */
export function evaluateVisibility(
    visibility,
    record
) {
    if (
        !Array.isArray(visibility) ||
        visibility.length === 0
    ) {
        return true;
    }

    return visibility.every(
        (condition) =>
            evaluateCondition(
                condition,
                record
            )
    );
}

/**
 * Alias useful from ActionField.
 */
export function isActionVisible(
    action,
    record
) {
    if (!action) {
        return false;
    }

    return evaluateVisibility(
        action.visibility,
        record
    );
}

/**
 * Evaluate disabled conditions.
 *
 * Same structure as visibility.
 */
export function isActionDisabled(
    action,
    record
) {
    if (!action) {
        return false;
    }

    if (action.disabled === true) {
        return true;
    }

    if (
        !Array.isArray(
            action.disabled
        )
    ) {
        return false;
    }

    return evaluateVisibility(
        action.disabled,
        record
    );
}