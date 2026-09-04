import { memo } from "react";
import clsx from "clsx";
import {
    MoreHorizontal,
    Eye,
    Pen,
} from "lucide-react";



export default memo(function ActionField({
    field,
    record,
    context = {},
}) {
    const actions = field.actions ?? [];

    const visibleActions = actions.filter((action) => {
        if (typeof action.visible === "function") {
            return action.visible(record, context);
        }

        return action.visible !== false;
    });

    const handleClick = (action) => {
        action.onClick?.({
            record,
            field,
            context,
        });
    };

    return (
        <div className="flex items-center  gap-1 w-full">

            {/* Edit */}

            {field.edit && (
                <button
                    type="button"
                    title="Edit"
                    onClick={(e) => {
                        e.stopPropagation();
                        field.edit.onClick({
                            record,
                            field,
                            context,
                        });
                    }}
                    className="
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-full
                        hover:bg-blue-100
                    "
                >
                    <Pen
                        size={18}
                        className="text-blue-600"
                    />
                </button>
            )}

            {/* View */}

            {field.view && (
                <button
                    type="button"
                    title="View"
                    onClick={(e) => {
                        e.stopPropagation();
                        field.view.onClick({
                            record,
                            field,
                            context,
                        });
                    }}
                    className="
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-full
                        hover:bg-blue-100
                    "
                >
                    <Eye
                        size={18}
                        className="text-blue-600"
                    />
                </button>
            )}

            {/* More */}

            {/* {visibleActions.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-full
                                hover:bg-gray-100
                            "
                            onClick={(e) =>
                                e.stopPropagation()
                            }
                        >
                            <MoreHorizontal size={18} />
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        align="end"
                        className="w-56"
                    >
                        {visibleActions.map(
                            (action, index) => {
                                const Icon =
                                    action.icon;

                                const disabled =
                                    typeof action.disabled ===
                                        "function"
                                        ? action.disabled(
                                            record,
                                            context
                                        )
                                        : action.disabled;

                                return (
                                    <DropdownMenuItem
                                        key={action.id}
                                        disabled={
                                            disabled
                                        }
                                        onClick={() =>
                                            handleClick(
                                                action
                                            )
                                        }
                                        className={clsx(
                                            "flex items-center gap-2",
                                            action.danger &&
                                            "text-red-600 focus:text-red-600"
                                        )}
                                    >
                                        {Icon && (
                                            <Icon
                                                size={
                                                    16
                                                }
                                            />
                                        )}

                                        {action.label}

                                        {action.badge &&
                                            typeof action.badge ===
                                            "function" && (
                                                <span className="ml-auto rounded bg-gray-100 px-2 py-0.5 text-xs">
                                                    {action.badge(
                                                        record
                                                    )}
                                                </span>
                                            )}
                                    </DropdownMenuItem>
                                );
                            }
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )} */}
        </div>
    );
});