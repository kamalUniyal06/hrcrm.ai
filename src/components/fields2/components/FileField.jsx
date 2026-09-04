// fields/components/FileField.jsx

const FileField = ({
    field,
    value,
    presentation,
    onChange,
    disabled,
}) => {
    if (presentation === "display") {
        if (!value) {
            return <span>-</span>;
        }

        return (
            <a
                href={
                    typeof value ===
                        "object"
                        ? value.url
                        : value
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
            >
                {typeof value ===
                    "object"
                    ? value.name ??
                    "Open file"
                    : "Open file"}
            </a>
        );
    }

    return (
        <input
            type="file"
            disabled={disabled}
            onChange={(e) =>
                onChange?.(
                    e.target.files?.[0] ??
                    null
                )
            }
        />
    );
};

export default FileField;