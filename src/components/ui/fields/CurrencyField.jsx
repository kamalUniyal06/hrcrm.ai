import useEditableField from "./hooks/useEditableField";

export default function CurrencyField(props) {

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

    const currency =
        props.field.props?.currency ?? "USD";

    if (editing) {

        return (

            <input

                ref={inputRef}

                type="number"

                value={value}

                className="w-full rounded border border-blue-500 px-2 py-1"

                onChange={(e) => setValue(e.target.value)}

                onBlur={save}

                onKeyDown={(e) => {

                    if (e.key === "Enter") save();

                    if (e.key === "Escape") cancelEditing();

                }}

            />

        );

    }

    return (

        <span

            className={`font-medium ${editable ? "cursor-text" : ""}`}

            onDoubleClick={startEditing}

        >

            {new Intl.NumberFormat("en-US", {

                style: "currency",

                currency,

            }).format(Number(value || 0))}

        </span>

    );

}