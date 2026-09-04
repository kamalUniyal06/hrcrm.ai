// fields/components/ImageField.jsx

const ImageField = ({
    field,
    value,
    presentation,
    onChange,
    disabled,
}) => {
    if (presentation === "display") {
        if (!value) {
            return (
                <div className="text-gray-400">
                    No image
                </div>
            );
        }

        return (
            <img
                src={
                    typeof value ===
                        "object"
                        ? value.url
                        : value
                }
                alt={field.label ?? ""}
                className="h-12 w-12 rounded-full object-cover"
            />
        );
    }

    return (
        <input
            type="file"
            accept="image/*"
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

export default ImageField;