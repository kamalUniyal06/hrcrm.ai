// fields/components/RelationField.jsx

const RelationField = ({
    field,
    value,
    presentation,
    onChange,
    onCommit,
    disabled,
    readOnly,
    context,
}) => {
    if (presentation === "display") {
        if (!value) {
            return <span>-</span>;
        }

        return (
            <span>
                {typeof value === "object"
                    ? value.label ??
                    value.name
                    : value}
            </span>
        );
    }

    return (
        <RelationPicker
            field={field}
            value={value}
            disabled={disabled}
            readOnly={readOnly}
            context={context}
            onChange={onChange}
            onCommit={onCommit}
        />
    );
};

export default RelationField;