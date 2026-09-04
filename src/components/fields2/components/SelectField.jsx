// fields/components/SelectField.jsx

const SelectField = ({
    field,
    value,
    presentation,
    onChange,
    onCommit,
    onCancel,
    disabled,
    readOnly,
}) => {
    const options =
        field.options ?? [];

    const selected =
        options.find(
            (option) =>
                option.value === value
        );

    if (presentation === "display") {
        return (
            <span>
                {selected?.label ??
                    value ??
                    "-"}
            </span>
        );
    }

    return (
        <select
            value={value ?? ""}
            disabled={disabled}
            readOnly={readOnly}
            className="w-full rounded-md border px-3 py-2"
            onChange={(e) => {
                const option =
                    options.find(
                        (item) =>
                            String(
                                item.value
                            ) ===
                            e.target.value
                    );

                onChange?.(
                    option?.value ??
                    e.target.value
                );

                onCommit?.();
            }}
            onKeyDown={(e) => {
                if (
                    e.key === "Escape"
                ) {
                    onCancel?.();
                }
            }}
        >
            <option value="">
                Select...
            </option>

            {options.map((option) => (
                <option
                    key={option.value}
                    value={option.value}
                >
                    {option.label}
                </option>
            ))}
        </select>
    );
};

export default SelectField;