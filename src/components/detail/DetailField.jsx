import {
    useCallback,
    useEffect,
    useState,
} from "react";

import FieldRenderer from "@/components/fields2/FieldRenderer";
import { useDetailEdit } from "@/context/DetailEditContext";

const DetailField = ({
    field,
    value,
    record,
    updating = false,
    fieldKey,
    onSave,
}) => {
    const {
        isEditing,
        startEditing,
        stopEditing,
    } = useDetailEdit();

    const editing = isEditing(fieldKey);

    /*
     * ---------------------------------------------------------
     * DRAFT
     * ---------------------------------------------------------
     */
    const [draftValue, setDraftValue] =
        useState(value);

    /*
     * ---------------------------------------------------------
     * OPTIMISTIC VALUE
     * ---------------------------------------------------------
     *
     * null means there is no optimistic update.
     *
     * Otherwise this is the value we want to display
     * immediately while the API request is running.
     */
    const [optimisticValue, setOptimisticValue] =
        useState(null);

    /*
     * ---------------------------------------------------------
     * SYNC SERVER VALUE
     * ---------------------------------------------------------
     *
     * Once the parent/query receives the updated value,
     * remove the optimistic value and use the server value.
     */
    useEffect(() => {
        if (
            optimisticValue !== null &&
            Object.is(value, optimisticValue)
        ) {
            setOptimisticValue(null);
            setDraftValue(value);
        }
    }, [
        value,
        optimisticValue,
    ]);

    /*
     * ---------------------------------------------------------
     * INITIAL / EXTERNAL VALUE SYNC
     * ---------------------------------------------------------
     */
    useEffect(() => {
        if (
            !editing &&
            optimisticValue === null
        ) {
            setDraftValue(value);
        }
    }, [
        value,
        editing,
        optimisticValue,
    ]);

    /*
     * ---------------------------------------------------------
     * VALUE TO DISPLAY
     * ---------------------------------------------------------
     *
     * Priority:
     *
     * 1. Editing -> draft
     * 2. Optimistic update -> optimistic value
     * 3. Server value
     */
    const displayValue = editing
        ? draftValue
        : optimisticValue !== null
            ? optimisticValue
            : value;

    /*
     * ---------------------------------------------------------
     * START EDITING
     * ---------------------------------------------------------
     */

    const handleStartEditing = useCallback(
        (event) => {
            if (
                event?.target?.closest(
                    "[data-detail-field-action]"
                )
            ) {
                return;
            }

            if (
                field.readOnly ||
                field.editable === false ||
                updating ||
                optimisticValue !== null
            ) {
                return;
            }

            setDraftValue(value);

            startEditing(fieldKey);
        },
        [
            field.readOnly,
            field.editable,
            updating,
            optimisticValue,
            value,
            fieldKey,
            startEditing,
        ]
    );

    /*
     * ---------------------------------------------------------
     * SAVE
     * ---------------------------------------------------------
     */

    const handleSave = async (event) => {
        event?.preventDefault();
        event?.stopPropagation();

        if (updating) {
            return;
        }

        const previousValue = value;
        const newValue = draftValue;

        /*
         * Nothing changed.
         */
        if (
            Object.is(
                newValue,
                previousValue
            )
        ) {
            stopEditing();
            return;
        }

        /*
         * -----------------------------------------------------
         * IMPORTANT
         * -----------------------------------------------------
         *
         * Set optimistic value BEFORE calling onSave.
         *
         * React will render this value immediately.
         */
        setOptimisticValue(newValue);

        /*
         * Exit edit mode.
         */
        stopEditing();

        try {
            await onSave?.({
                value: newValue,
                previousValue,
                field,
                record,
            });

            /*
             * Parent/query should eventually provide
             * the new value.
             *
             * If it already did, the effect above will
             * remove optimisticValue automatically.
             */
        } catch (error) {
            /*
             * API failed.
             *
             * Restore the previous server value.
             */
            setOptimisticValue(null);
            setDraftValue(previousValue);

            console.error(
                "Field save failed:",
                error
            );
        }
    };

    /*
     * ---------------------------------------------------------
     * CANCEL
     * ---------------------------------------------------------
     */

    const handleCancel = (event) => {
        event?.preventDefault();
        event?.stopPropagation();

        if (updating) {
            return;
        }

        setDraftValue(
            optimisticValue !== null
                ? optimisticValue
                : value
        );

        stopEditing();
    };

    /*
     * ---------------------------------------------------------
     * BLUR
     * ---------------------------------------------------------
     */

    const handleBlur = (event) => {
        if (!editing || updating) {
            return;
        }

        const relatedTarget =
            event.relatedTarget;

        if (
            relatedTarget &&
            event.currentTarget.contains(
                relatedTarget
            )
        ) {
            return;
        }

        handleCancel();
    };

    /*
     * ---------------------------------------------------------
     * KEYBOARD
     * ---------------------------------------------------------
     */

    const handleKeyDown = (event) => {
        if (!editing || updating) {
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            handleCancel(event);
            return;
        }

        if (
            event.key === "Enter" &&
            !event.shiftKey &&
            field.type !== "textarea" &&
            field.type !== "long_text"
        ) {
            event.preventDefault();
            handleSave(event);
        }
    };

    return (
        <div
            className="group min-w-0"
            onDoubleClick={handleStartEditing}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                    {field.label}
                </span>

                {!editing &&
                    field.editable !== false && (
                        <span
                            className="
                                text-xs
                                text-gray-400
                                opacity-0
                                transition
                                group-hover:opacity-100
                            "
                        >
                            Double click to edit
                        </span>
                    )}
            </div>

            <div
                className={`
                    flex
                    min-h-9
                    items-center
                    gap-2
                    rounded-md
                    px-2
                    py-1

                    ${!editing &&
                        field.editable !== false
                        ? "cursor-pointer transition hover:bg-gray-50"
                        : ""
                    }
                `}
            >
                <div className="min-w-0 flex-1">
                    <FieldRenderer
                        field={field}
                        value={displayValue}
                        record={record}
                        presentation={
                            editing
                                ? "edit"
                                : "display"
                        }
                        onChange={
                            setDraftValue
                        }
                        onCommit={
                            handleSave
                        }
                        onCancel={
                            handleCancel
                        }
                        disabled={updating}
                    />
                </div>
            </div>
        </div>
    );
};

export default DetailField;