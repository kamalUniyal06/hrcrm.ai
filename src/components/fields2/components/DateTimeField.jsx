// fields/components/DateTimeField.jsx

const DateTimeField = ({
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
            <span>
                {new Intl.DateTimeFormat(
                    undefined,
                    {
                        dateStyle: "medium",
                        timeStyle: "short",
                    }
                ).format(new Date(value))}
            </span>
        );
    }

    const inputValue = value
        ? new Date(value)
            .toISOString()
            .slice(0, 16)
        : "";

    return (
        <input
            type="datetime-local"
            value={inputValue}
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

export default DateTimeField;