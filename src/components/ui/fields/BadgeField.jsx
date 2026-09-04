import clsx from "clsx";
import useEditableField from "./hooks/useEditableField";

const COLORS = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
    pink: "bg-pink-100 text-pink-700",
    indigo: "bg-indigo-100 text-indigo-700",
};

export default function BadgeField(props) {
    const {
        field,
    } = props;

    const {
        editable,
        startEditing,
        value,
    } = useEditableField(props);

    const color =
        field.props?.color ??
        field.color ??
        "gray";

    const rounded =
        field.props?.rounded !== false;

    const displayValue =
        typeof field.formatter === "function"
            ? field.formatter(value, props.record)
            : value;

    return (
        <div
            className="w-full"
            onDoubleClick={startEditing}
        >
            <span
                className={clsx(
                    "inline-flex items-center justify-center",
                    "px-3 py-1",
                    "text-xs font-semibold",
                    COLORS[color] ?? COLORS.gray,
                    rounded
                        ? "rounded-full"
                        : "rounded-md",
                    editable && "cursor-pointer"
                )}
            >
                {displayValue || "-"}
            </span>
        </div>
    );
}