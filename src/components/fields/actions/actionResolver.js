/**
 * Get a value from either the current record
 * or the action execution context.
 *
 * Examples:
 *
 * {id}
 * {client_email}
 * {context.user.id}
 */
export function getPathValue(
    path,
    record = {},
    context = {}
) {
    const keys = path.split(".");

    // Try record first
    let value = keys.reduce(
        (current, key) => current?.[key],
        record
    );

    if (value !== undefined) {
        return value;
    }

    // Then try context
    value = keys.reduce(
        (current, key) => current?.[key],
        context
    );

    return value;
}

/**
 * Resolve placeholders inside strings.
 *
 * Example:
 *
 * "/orders/{id}/contact/{client_email}"
 *
 * becomes:
 *
 * "/orders/123/contact/test@gmail.com"
 */
export function resolveTemplate(
    value,
    record = {},
    context = {}
) {
    if (typeof value !== "string") {
        return value;
    }

    return value.replace(
        /\{([^{}]+)\}/g,
        (_, expression) => {
            const result = getPathValue(
                expression.trim(),
                record,
                context
            );

            if (
                result === undefined ||
                result === null
            ) {
                return "";
            }

            return encodeURIComponent(String(result));
        }
    );
}

/**
 * Recursively resolve dynamic values.
 *
 * Supports:
 *
 * string
 * object
 * array
 * number
 * boolean
 * null
 *
 * Example:
 *
 * {
 *   status: "completed",
 *   id: "{id}",
 *   email: "{client_email}",
 *   meta: {
 *      user: "{context.user.id}"
 *   }
 * }
 */
export function resolveDynamicValue(
    value,
    record = {},
    context = {}
) {
    // String
    if (typeof value === "string") {
        return resolveTemplate(
            value,
            record,
            context
        );
    }

    // Array
    if (Array.isArray(value)) {
        return value.map((item) =>
            resolveDynamicValue(
                item,
                record,
                context
            )
        );
    }

    // Object
    if (
        value !== null &&
        typeof value === "object"
    ) {
        return Object.fromEntries(
            Object.entries(value).map(
                ([key, childValue]) => [
                    key,
                    resolveDynamicValue(
                        childValue,
                        record,
                        context
                    ),
                ]
            )
        );
    }

    // Number / boolean / null
    return value;
}

/**
 * Resolve an entire request object.
 *
 * This is useful if later you want to support
 * dynamic method, endpoint, params, headers, etc.
 */
export function resolveRequest(
    request,
    record = {},
    context = {}
) {
    if (!request) {
        return {};
    }

    return {
        ...request,

        endpoint:
            request.endpoint
                ? resolveTemplate(
                    request.endpoint,
                    record,
                    context
                )
                : request.endpoint,

        params:
            resolveDynamicValue(
                request.params,
                record,
                context
            ),

        body:
            resolveDynamicValue(
                request.body,
                record,
                context
            ),

        headers:
            resolveDynamicValue(
                request.headers,
                record,
                context
            ),
    };
}