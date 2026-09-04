import { memo } from "react";
import FIELD_COMPONENTS from "./fieldRegistry.js";

function FieldRenderer({
    row,
    column,
    value,
}) {
    const Component =
        FIELD_COMPONENTS[column?.type]
    console.log("COLUMN", column)
    if (!Component) return;

    return (
        <Component
            row={row}
            value={value}
            column={column}
        />
    );
}

export default memo(FieldRenderer);