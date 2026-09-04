// fields/components/TimeField.jsx

const TimeField = ({
    field,
    value,
    presentation,
    onChange,
    onCommit,
    onCancel,
    disabled,
    readOnly,
}) => {
    if (presentation === "display") {
        return (
            <span>
                {value || "-"}
            </span>
        );
    }

    return (
        <input
            type="time"
            value={value ?? ""}
            disabled={disabled}
            readOnly={readOnly}
            className="w-full rounded-md border px-3 py-2"
            onChange={(e) =>
                onChange?.(e.target.value)
            }
            onBlur={() => onCommit?.()}
            onKeyDown={(e) => {
                if (
                    e.key === "Escape"
                ) {
                    onCancel?.();
                }
            }}
        />
    );
};

export default TimeField;