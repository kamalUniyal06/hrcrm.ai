import {
    resolveRequest,
    resolveTemplate,
    resolveDynamicValue,
} from "./actionResolver";

/**
 * Main Action Engine
 *
 * Supported action types:
 *
 * navigate
 * mutation
 * modal
 * callback
 *
 * "callback" is frontend-only and should NOT
 * be supplied directly by your backend JSON.
 */
export async function executeAction({
    action,
    record,
    context = {},
}) {
    if (!action) {
        throw new Error(
            "Action is required"
        );
    }

    switch (action.type) {
        case "navigate":
            return executeNavigation({
                action,
                record,
                context,
            });

        case "mutation":
            return executeMutation({
                action,
                record,
                context,
            });

        case "modal":
            return executeModal({
                action,
                record,
                context,
            });

        case "callback":
            return executeCallback({
                action,
                record,
                context,
            });

        default:
            throw new Error(
                `Unsupported action type: ${action.type}`
            );
    }
}

/* -------------------------------------------------------------------------- */
/*                              NAVIGATION                                    */
/* -------------------------------------------------------------------------- */

function executeNavigation({
    action,
    record,
    context,
}) {
    if (!action.target) {
        throw new Error(
            "Navigation action requires target"
        );
    }

    if (
        typeof context.navigate !== "function"
    ) {
        throw new Error(
            "Navigation function is not available"
        );
    }

    const target = resolveTemplate(
        action.target,
        record,
        context
    );

    switch (action.targetType) {
        case "relative": {
            const currentPath =
                context.location?.pathname ??
                window.location.pathname;

            const finalTarget = `${currentPath.replace(
                /\/$/,
                ""
            )}/${target.replace(/^\//, "")}`;

            return context.navigate(finalTarget);
        }

        case "absolute":
        default:
            return context.navigate(target);
    }
}

/* -------------------------------------------------------------------------- */
/*                                MUTATION                                    */
/* -------------------------------------------------------------------------- */

async function executeMutation({
    action,
    record,
    context,
}) {
    if (
        typeof context.mutateAsync !==
        "function"
    ) {
        throw new Error(
            "Action mutation is not available"
        );
    }

    return context.mutateAsync({
        action,
        record,
        context,
    });
}

/* -------------------------------------------------------------------------- */
/*                                  MODAL                                     */
/* -------------------------------------------------------------------------- */

async function executeModal({
    action,
    record,
    context,
}) {
    if (
        typeof context.openModal !==
        "function"
    ) {
        throw new Error(
            "openModal is not available"
        );
    }

    const props =
        resolveDynamicValue(
            action.props ?? {},
            record,
            context
        );

    return context.openModal({
        modal:
            action.modal,

        props,

        record,

        action,
    });
}

/* -------------------------------------------------------------------------- */
/*                                CALLBACK                                    */
/* -------------------------------------------------------------------------- */

/**
 * This is intentionally frontend-only.
 *
 * Backend JSON should NOT send executable functions.
 *
 * If you ever need a frontend-only action:
 *
 * {
 *   type: "callback",
 *   operation: "someRegisteredOperation"
 * }
 *
 * context.operations provides the implementation.
 */
async function executeCallback({
    action,
    record,
    context,
}) {
    const operation =
        action.operation;

    const handler =
        context.operations?.[
        operation
        ];

    if (
        typeof handler !==
        "function"
    ) {
        throw new Error(
            `No callback operation registered: ${operation}`
        );
    }

    return handler({
        action,
        record,
        context,
    });
}

/* -------------------------------------------------------------------------- */
/*                              VALIDATION                                    */
/* -------------------------------------------------------------------------- */

function validateEndpoint(
    endpoint
) {
    if (!endpoint) {
        throw new Error(
            "API endpoint is required"
        );
    }

    /*
     * Recommended:
     * Only allow relative API URLs.
     *
     * Good:
     * /orders/{id}
     *
     * Bad:
     * https://example.com/...
     */
    if (
        !endpoint.startsWith("/")
    ) {
        throw new Error(
            "Only relative API endpoints are allowed"
        );
    }
}