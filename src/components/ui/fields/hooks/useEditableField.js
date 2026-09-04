import { useEffect, useRef, useState } from "react";

export default function useEditableField({
    field,
    value,
    record,
    onSave,
    disabled,
    mode = "table",
}) {
    // console.log("filed", field)

    const editable =
        field?.editable &&
        !disabled &&
        mode !== "view";

    const [editing, setEditing] = useState(false);

    const [currentValue, setCurrentValue] =
        useState(value ?? "");

    const inputRef = useRef(null);

    useEffect(() => {
        setCurrentValue(value ?? "");
    }, [value]);

    useEffect(() => {
        if (editing) {
            requestAnimationFrame(() => {
                inputRef.current?.focus();
                inputRef.current?.select?.();
            });
        }
    }, [editing]);

    const startEditing = () => {
        if (!editable) return;

        setEditing(true);
    };

    const cancelEditing = () => {
        setCurrentValue(value ?? "");
        setEditing(false);
    };

    const save = () => {

        setEditing(false);

        if (currentValue === value) return;
        onSave?.({
            field,
            record,
            oldValue: value,
            value: currentValue,
        });
    };

    return {

        editing,

        editable,

        inputRef,

        value: currentValue,

        setValue: setCurrentValue,

        startEditing,

        cancelEditing,

        save,

    };
}