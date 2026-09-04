// fields/components/PercentField.jsx

const PercentField = ({
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
                {value === null ||
                    value === undefined
                    ? "-"
                    : `${value}%`}
            </span>
        );
    }

    return (
        <input
            type="number"
            min={field.min ?? 0}
            max={field.max ?? 100}
            value={value ?? ""}
            disabled={disabled}
            readOnly={readOnly}
            className="w-full rounded-md border px-3 py-2"
            onChange={(e) =>
                onChange?.(
                    e.target.value === ""
                        ? null
                        : Number(e.target.value)
                )
            }
            onBlur={() => onCommit?.()}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    onCommit?.();
                }

                if (e.key === "Escape") {
                    onCancel?.();
                }
            }}
        />
    );
};

export default PercentField;