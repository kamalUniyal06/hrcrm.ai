import useEditableField from "./hooks/useEditableField";

export default function NumberField(props) {
    const {
        editing,
        editable,
        inputRef,
        value,
        setValue,
        startEditing,
        cancelEditing,
        save,
    } = useEditableField(props);

    if (editing) {
        return (
            <input
                ref={inputRef}
                type="number"
                value={value ?? ""}
                className="
                    w-full
                    rounded
                    border
                    border-blue-500
                    bg-white
                    px-2
                    py-1
                    outline-none
                "
                onChange={(e) =>
                    setValue(e.target.value)
                }
                onBlur={save}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        save();
                    }

                    if (e.key === "Escape") {
                        cancelEditing();
                    }
                }}
            />
        );
    }

    return (
        <span
            className={`
                block
                w-full
                truncate
                ${editable ? "cursor-text" : ""}
            `}
            onDoubleClick={startEditing}
        >
            {value !== null &&
                value !== undefined &&
                value !== ""
                ? value
                : "-"}
        </span>
    );
}