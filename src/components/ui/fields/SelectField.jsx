import { useMemo } from "react";
import {
    Check,
    ChevronDown,
} from "lucide-react";
import useEditableField from "./hooks/useEditableField";

export default function SelectField(props) {
    const { field } = props;

    const {
        editing,
        editable,
        value,
        setValue,
        startEditing,
        cancelEditing,
        save,
    } = useEditableField(props);

    const options = field?.options || [];

    const selected = useMemo(() => {
        return (
            options.find(
                (option) => option.value === value
            ) || null
        );
    }, [options, value]);

    const badgeColor = (color) => {
        switch (color) {
            case "blue":
                return "bg-blue-100 text-blue-700";

            case "green":
                return "bg-green-100 text-green-700";

            case "yellow":
                return "bg-yellow-100 text-yellow-700";

            case "red":
                return "bg-red-100 text-red-700";

            case "purple":
                return "bg-purple-100 text-purple-700";

            case "gray":
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    if (editing) {
        return (
            <select
                autoFocus
                value={value ?? ""}
                onBlur={save}
                onChange={(e) =>
                    setValue(e.target.value)
                }
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        save();
                    }

                    if (e.key === "Escape") {
                        cancelEditing();
                    }
                }}
                className="
                    w-full
                    rounded-md
                    border
                    border-blue-500
                    bg-white
                    px-2
                    py-1
                    outline-none
                "
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
    }

    return (
        <div
            onDoubleClick={startEditing}
            className={`
                flex
                w-full
                items-center
                justify-between
                gap-2
                ${editable ? "cursor-pointer" : ""}
            `}
        >
            <span
                className={`
                    inline-flex
                    items-center
                    rounded-full
                    px-3
                    py-1
                    text-xs
                    font-medium
                    truncate
                    ${badgeColor(selected?.color)}
                `}
            >
                {selected?.label || "-"}
            </span>

            {editable && (
                <ChevronDown
                    size={14}
                    className="text-gray-400"
                />
            )}
        </div>
    );
}