// fields/components/EmailField.jsx

const EmailField = ({
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
        if (!value) {
            return <span>-</span>;
        }

        return (
            <a
                href={`mailto:${value}`}
                className="text-blue-600 hover:underline"
            >
                {value}
            </a>
        );
    }

    return (
        <input
            type="email"
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

export default EmailField;