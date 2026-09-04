// fields/FieldRenderer.jsx

import FIELD_REGISTRY from "./fieldRegistry";

const FieldRenderer = ({
    field,
    value,
    record,

    // display | edit
    presentation = "display",

    // Field lifecycle
    onChange,
    onCommit,
    onCancel,

    // State
    disabled = false,
    readOnly = false,
    loading = false,
    error = null,

    // Extra context
    context = {},

    ...rest
}) => {
    const Component =
        FIELD_REGISTRY[field?.type] ??
        FIELD_REGISTRY.text;

    if (!Component) {
        return null;
    }

    return (
        <Component
            field={field}
            value={value}
            record={record}
            presentation={presentation}
            onChange={onChange}
            onCommit={onCommit}
            onCancel={onCancel}
            disabled={disabled}
            readOnly={readOnly}
            loading={loading}
            error={error}
            context={context}
            {...rest}
        />
    );
};

export default FieldRenderer;