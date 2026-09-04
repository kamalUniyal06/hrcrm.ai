// fields/components/UrlField.jsx

const UrlField = ({
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
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
            >
                {field.displayValue ?? value}
            </a>
        );
    }

    return (
        <input
            type="url"
            value={value ?? ""}
            disabled={disabled}
            readOnly={readOnly}
            placeholder={
                field.placeholder ??
                "https://..."
            }
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

export default UrlField;