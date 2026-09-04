// fields/components/JsonField.jsx

const JsonField = ({
    field,
    value,
    presentation,
    onChange,
    onCommit,
    onCancel,
    disabled,
}) => {
    const stringValue =
        typeof value === "string"
            ? value
            : JSON.stringify(
                value ?? {},
                null,
                2
            );

    if (presentation === "display") {
        return (
            <pre className="max-w-full overflow-auto rounded-md bg-gray-50 p-3 text-sm">
                {stringValue}
            </pre>
        );
    }

    return (
        <textarea
            value={stringValue}
            disabled={disabled}
            rows={field.rows ?? 8}
            className="w-full rounded-md border px-3 py-2 font-mono text-sm"
            onChange={(e) =>
                onChange?.(
                    e.target.value
                )
            }
            onBlur={() => {
                try {
                    const parsed =
                        JSON.parse(
                            stringValue
                        );

                    onChange?.(parsed);
                    onCommit?.();
                } catch {
                    // validation error
                }
            }}
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

export default JsonField;