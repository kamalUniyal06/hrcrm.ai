import { memo, useCallback } from "react";
import DynamicField from "../fields/DynamicField";
import { useTableContext } from "./Table";
import toast from "react-hot-toast";
import { useUpdateEntity } from "@/queries/entity.queries";

function TableCell({
    row,
    column,
}) {
    const sticky = column.sticky;

    const {
        actionContext,
        entity,
        layout,
    } = useTableContext();

    const updateMutation = useUpdateEntity();

    const handleSave = useCallback(
        async ({
            field,
            value,
            rowId,
            record,
        }) => {
            /*
             * IMPORTANT:
             * Capture the value BEFORE updating it.
             *
             * Example:
             * old value = "Active"
             * new value = "Inactive"
             *
             * previousValue will remain "Active"
             * even after the update request succeeds.
             */
            const previousValue =
                record?.[field.accessor];

            const newValue = value;

            const toastId = toast.loading(
                "Saving changes..."
            );

            try {
                /*
                 * First request:
                 * Save the new value.
                 */
                await updateMutation.mutateAsync({
                    entity: entity,
                    module: layout?.module,
                    id: rowId,
                    payload: {
                        [field.accessor]: newValue,
                    },
                });

                /*
                 * Update succeeded.
                 *
                 * The previousValue variable is captured
                 * by this toast callback, so it will still
                 * be available when the user clicks Undo.
                 */
                toast.success(
                    (t) => {
                        let undoClicked = false;

                        const handleUndo = async () => {
                            if (undoClicked) {
                                return;
                            }

                            undoClicked = true;

                            /*
                             * Close the current toast immediately
                             * so the user knows Undo was clicked.
                             */
                            toast.loading(
                                "Undoing changes...",
                                {
                                    id: toastId,
                                }
                            );

                            try {
                                /*
                                 * Second request:
                                 * Restore the OLD value.
                                 */
                                await updateMutation.mutateAsync({
                                    entity: entity,
                                    module: layout?.module,
                                    id: rowId,
                                    payload: {
                                        [field.accessor]:
                                            previousValue,
                                    },
                                });

                                toast.success(
                                    "Changes undone",
                                    {
                                        id: toastId,
                                        duration: 3000,
                                    }
                                );
                            } catch (error) {
                                console.error(
                                    "Undo failed:",
                                    error
                                );

                                toast.error(
                                    "Failed to undo changes",
                                    {
                                        id: toastId,
                                    }
                                );
                            }
                        };

                        return (
                            <div className="flex items-center gap-3">
                                <span>
                                    Changes saved
                                </span>

                                <button
                                    type="button"
                                    onClick={handleUndo}
                                    disabled={undoClicked}
                                    className="font-medium text-blue-600 hover:text-blue-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Undo
                                </button>
                            </div>
                        );
                    },
                    {
                        id: toastId,
                        duration: 5000,
                    }
                );
            } catch (error) {
                console.error(
                    "Update failed:",
                    error
                );

                toast.error(
                    "Failed to save changes",
                    {
                        id: toastId,
                    }
                );
            }
        },
        [
            entity,
            layout,
            updateMutation,
        ]
    );

    return (
        <div
            onClick={() =>
                column.onClick?.(row)
            }
            className={`
                relative
                flex
                items-center
                px-4
                py-3
                overflow-hidden
                whitespace-nowrap
                hover:border
                hover:border-blue-300
                transition-colors
                ${column.classes ?? ""}
            `}
            style={{
                position: sticky
                    ? "sticky"
                    : "relative",

                left: sticky
                    ? column.left
                    : undefined,

                zIndex: sticky
                    ? 20
                    : 1,

                background: sticky
                    ? "#fff"
                    : undefined,

                isolation: sticky
                    ? "isolate"
                    : undefined,
            }}
        >
            <DynamicField
                mode="table"
                field={column}
                value={
                    row[column.accessor]
                }
                record={row}
                onSave={handleSave}
                actionContext={
                    actionContext
                }
                disabled={
                    updateMutation.isPending
                }
            />
        </div>
    );
}

export default memo(TableCell);