import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import useEditableField from "./hooks/useEditableField";

dayjs.extend(relativeTime);

export default function DateField(props) {
    const {
        field,
    } = props;

    const {
        editing,
        editable,
        inputRef,
        value,
        setValue,
        startEditing,
        cancelEditing,
        save,
    } = useEditableField(props);

    const formatValue = () => {
        if (!value) return "-";

        switch (field.format) {
            case "timeAgo":
                return dayjs(value).fromNow();

            case "datetime":
                return dayjs(value).format(
                    "DD MMM YYYY hh:mm A"
                );

            case "date":
            default:
                return dayjs(value).format(
                    "DD MMM YYYY"
                );
        }
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                type="date"
                value={
                    value
                        ? dayjs(value).format(
                            "YYYY-MM-DD"
                        )
                        : ""
                }
                className="
                    w-full
                    rounded
                    border
                    border-blue-500
                    bg-white
                    px-2
                    py-1
                    outline-none
                "
                onChange={(e) =>
                    setValue(e.target.value)
                }
                onBlur={save}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        save();
                    }

                    if (e.key === "Escape") {
                        cancelEditing();
                    }
                }}
            />
        );
    }

    return (
        <span
            className={`
                block
                w-full
                truncate
                ${editable ? "cursor-text" : ""}
            `}
            onDoubleClick={startEditing}
        >
            {value}
        </span>
    );
}