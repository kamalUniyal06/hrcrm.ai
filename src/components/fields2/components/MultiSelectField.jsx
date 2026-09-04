// fields/components/MultiSelectField.jsx

const MultiSelectField = ({
    field,
    value = [],
    presentation,
    onChange,
    onCommit,
    disabled,
    readOnly,
}) => {
    const options =
        field.options ?? [];

    const values = Array.isArray(value)
        ? value
        : [];

    if (presentation === "display") {
        const labels = options
            .filter((option) =>
                values.includes(
                    option.value
                )
            )
            .map((option) =>
                option.label
            );

        return (
            <div className="flex flex-wrap gap-1">
                {labels.length
                    ? labels.map(
                        (label) => (
                            <span
                                key={
                                    label
                                }
                                className="rounded-full bg-gray-100 px-2 py-1 text-sm"
                            >
                                {label}
                            </span>
                        )
                    )
                    : "-"}
            </div>
        );
    }

    return (
        <select
            multiple
            value={values}
            disabled={disabled}
            className="w-full rounded-md border px-3 py-2"
            onChange={(e) => {
                const selected =
                    Array.from(
                        e.target
                            .selectedOptions
                    ).map(
                        (option) =>
                            options.find(
                                (item) =>
                                    String(
                                        item.value
                                    ) ===
                                    option.value
                            )?.value ??
                            option.value
                    );

                onChange?.(selected);
                onCommit?.();
            }}
        >
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

export default MultiSelectField;