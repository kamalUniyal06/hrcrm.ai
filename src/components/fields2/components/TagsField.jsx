// fields/components/TagsField.jsx

const TagsField = ({
    field,
    value = [],
    presentation,
    onChange,
    onCommit,
    disabled,
}) => {
    const tags = Array.isArray(value)
        ? value
        : [];

    if (presentation === "display") {
        return (
            <div className="flex flex-wrap gap-1">
                {tags.length
                    ? tags.map((tag) => (
                        <span
                            key={
                                typeof tag ===
                                    "object"
                                    ? tag.id
                                    : tag
                            }
                            className="rounded-full bg-gray-100 px-2 py-1 text-sm"
                        >
                            {typeof tag ===
                                "object"
                                ? tag.name
                                : tag}
                        </span>
                    ))
                    : "-"}
            </div>
        );
    }

    return (
        <TagInput
            value={tags}
            disabled={disabled}
            onChange={onChange}
            onCommit={onCommit}
        />
    );
};

export default TagsField;