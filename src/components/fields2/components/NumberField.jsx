// fields/components/NumberField.jsx

const NumberField = ({
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
                {value ?? "-"}
            </span>
        );
    }

    return (
        <input
            type="number"
            value={value ?? ""}
            min={field.min}
            max={field.max}
            step={field.step ?? "any"}
            disabled={disabled}
            readOnly={readOnly}
            className="w-full rounded-md border px-3 py-2"
            onChange={(e) => {
                const value =
                    e.target.value === ""
                        ? null
                        : Number(e.target.value);

                onChange?.(value);
            }}
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

export default NumberField;