// fields/components/CurrencyField.jsx

const CurrencyField = ({
    field,
    value,
    presentation,
    onChange,
    onCommit,
    onCancel,
    disabled,
    readOnly,
}) => {
    const currency =
        field.currency ?? "USD";

    if (presentation === "display") {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return <span>-</span>;
        }

        return (
            <span>
                {new Intl.NumberFormat(
                    undefined,
                    {
                        style: "currency",
                        currency,
                    }
                ).format(Number(value))}
            </span>
        );
    }

    return (
        <input
            type="number"
            value={value ?? ""}
            step="any"
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

export default CurrencyField;