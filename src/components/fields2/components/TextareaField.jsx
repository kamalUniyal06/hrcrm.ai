// fields/components/TextareaField.jsx

const TextareaField = ({
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
            <div className="whitespace-pre-wrap">
                {value || "-"}
            </div>
        );
    }

    return (
        <textarea
            value={value ?? ""}
            rows={field.rows ?? 4}
            disabled={disabled}
            readOnly={readOnly}
            placeholder={field.placeholder}
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

export default TextareaField;