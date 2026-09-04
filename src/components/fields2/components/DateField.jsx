// fields/components/DateField.jsx

const DateField = ({
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
                        dateStyle:
                            field.dateStyle ??
                            "medium",
                    }
                ).format(new Date(value))}
            </span>
        );
    }

    return (
        <input
            type="date"
            value={
                value
                    ? String(value).slice(0, 10)
                    : ""
            }
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

export default DateField;