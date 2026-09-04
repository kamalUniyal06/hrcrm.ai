import {
    memo,
    useMemo,
    useState,
} from "react";

import {
    MoreHorizontal,
} from "lucide-react";

// import {
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
    executeAction,
} from "./ActionEngine";

import {
    isActionVisible,
    isActionDisabled,
} from "./actionConditions";
import Icon from "../../ui/Icon/Icon";

function ActionField({
    field,
    record,
    actionContext: context = {},
}) {
    // console.log("FIED", field)
    const [
        loadingAction,
        setLoadingAction,
    ] = useState(null);

    const actions =
        field?.actions ?? [];

    /* ---------------------------------------------------------------------- */
    /*                              ACTION LISTS                              */
    /* ---------------------------------------------------------------------- */

    const visibleActions =
        useMemo(() => {
            return actions.filter(
                (action) =>
                    isActionVisible(
                        action,
                        record
                    )
            );
        }, [
            actions,
            record,
        ]);

    const primaryActions =
        visibleActions.filter(
            (action) =>
                action.placement ===
                "primary"
        );

    const menuActions =
        visibleActions.filter(
            (action) =>
                action.placement !==
                "primary"
        );

    /* ---------------------------------------------------------------------- */
    /*                            ACTION EXECUTION                            */
    /* ---------------------------------------------------------------------- */

    const handleAction = async (
        action
    ) => {
        if (!action) {
            return;
        }

        const disabled =
            isActionDisabled(
                action,
                record
            );

        if (disabled) {
            return;
        }

        /* ----------------------------- */
        /*          CONFIRMATION          */
        /* ----------------------------- */

        if (
            action.confirm?.enabled
        ) {
            const title =
                action.confirm.title ||
                "Are you sure?";

            const description =
                action.confirm
                    .description ||
                "";

            const message =
                description
                    ? `${title}\n\n${description}`
                    : title;

            const confirmed =
                window.confirm(
                    message
                );

            if (!confirmed) {
                return;
            }
        }

        try {
            setLoadingAction(
                action.id
            );

            await executeAction({
                action,
                record,
                context,
            });

            context.onActionSuccess?.({
                action,
                record,
            });
        } catch (error) {
            console.error(
                "Action execution failed:",
                error
            );

            context.onActionError?.({
                action,
                record,
                error,
            });
        } finally {
            setLoadingAction(null);
        }
    };

    /* ---------------------------------------------------------------------- */
    /*                              ICON                                      */
    /* ---------------------------------------------------------------------- */

    const getIcon = (action) => {
        if (!action?.icon) {
            return null;
        }

        return Icon({ ...action.icon })
    };

    /* ---------------------------------------------------------------------- */
    /*                          PRIMARY ACTION                                */
    /* ---------------------------------------------------------------------- */

    const renderPrimaryAction = (
        action
    ) => {
        const Icon =
            getIcon(action);

        const loading =
            loadingAction ===
            action.id;

        const disabled =
            isActionDisabled(
                action,
                record
            );

        return (
            <button
                key={action.id}
                type="button"
                title={
                    action.tooltip ||
                    action.label
                }
                disabled={
                    disabled ||
                    loading
                }
                onClick={(e) => {
                    e.stopPropagation();

                    handleAction(
                        action
                    );
                }}
                className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    transition-all
                    duration-150
                    hover:bg-gray-100
                    active:scale-95
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                "
            >
                {loading ? (
                    <span
                        className="
                            h-4
                            w-4
                            animate-spin
                            rounded-full
                            border-2
                            border-gray-300
                            border-t-blue-600
                        "
                    />
                ) : (
                    Icon && Icon
                )
                }
            </button>
        );
    };

    /* ---------------------------------------------------------------------- */
    /*                             MENU ACTION                                */
    /* ---------------------------------------------------------------------- */

    const renderMenuAction = (
        action
    ) => {
        const Icon =
            getIcon(action);

        const loading =
            loadingAction ===
            action.id;

        const disabled =
            isActionDisabled(
                action,
                record
            );

        return (
            <DropdownMenuItem
                key={action.id}
                disabled={
                    disabled ||
                    loading
                }
                onClick={(e) => {
                    e.stopPropagation();

                    handleAction(
                        action
                    );
                }}
                className={`
                    flex
                    items-center
                    gap-2
                    ${action.danger
                        ? "text-red-600 focus:text-red-600"
                        : ""
                    }
                `}
            >
                {loading ? (
                    <span
                        className="
                            h-4
                            w-4
                            animate-spin
                            rounded-full
                            border-2
                            border-gray-300
                            border-t-blue-600
                        "
                    />
                ) : (
                    Icon && Icon
                )}

                <span className="flex-1">
                    {action.label}
                </span>
            </DropdownMenuItem>
        );
    };

    /* ---------------------------------------------------------------------- */
    /*                                RENDER                                  */
    /* ---------------------------------------------------------------------- */

    if (!actions.length) {
        return null;
    }

    return (
        <div
            className="
                flex
                w-full
                min-w-0
                items-center
                gap-1
            "
        >
            {/* PRIMARY ACTIONS */}

            {primaryActions.map(
                renderPrimaryAction
            )}

            {/* MORE MENU */}

            {menuActions.length >
                0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            asChild
                        >
                            <button
                                type="button"
                                title="More actions"
                                onClick={(e) =>
                                    e.stopPropagation()
                                }
                                className="
                                flex
                                h-8
                                w-8
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                transition
                                hover:bg-gray-100
                                active:scale-95
                            "
                            >
                                <MoreHorizontal
                                    size={18}
                                />
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                            side="right"
                            align="start"
                            sideOffset={6}
                            className="w-56"
                        >
                            {menuActions.map(
                                (
                                    action,
                                    index
                                ) => (
                                    <div
                                        key={
                                            action.id
                                        }
                                    >
                                        {action.separatorBefore &&
                                            index >
                                            0 && (
                                                <DropdownMenuSeparator />
                                            )}

                                        {renderMenuAction(
                                            action
                                        )}
                                    </div>
                                )
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
        </div>
    );
}

export default memo(
    ActionField
);