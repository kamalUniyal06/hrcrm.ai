// fields/components/TextField.jsx

const TextField = ({
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
            <span className="break-words">
                {value || "-"}
            </span>
        );
    }

    return (
        <input
            type="text"
            value={value ?? ""}
            disabled={disabled}
            readOnly={readOnly}
            placeholder={field.placeholder}
            className="w-full rounded-md border px-3 py-2"
            onChange={(e) =>
                onChange?.(e.target.value)
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

export default TextField;