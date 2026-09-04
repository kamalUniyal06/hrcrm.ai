import {
    ChevronDown,
    ExternalLink,
    Mail,
    Pencil,
    Phone,
    Star,
    User,
} from "lucide-react";

import {
    forwardRef,
    useEffect,
    useRef,
    useState,
} from "react";


// ============================================================
// CONSTANTS
// ============================================================

const EMPTY_VALUE = "—";


// ============================================================
// HELPERS
// ============================================================

function normalizeValue(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return value;
}


function isEmpty(value) {
    return (
        value === null ||
        value === undefined ||
        value === ""
    );
}


function isTruthy(value) {
    return (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true"
    );
}


function getOptionLabel(field, value) {
    const option =
        field?.options?.find(
            (item) =>
                String(item.value) ===
                String(value)
        );

    return option?.label ?? value;
}


// ============================================================
// DATE HELPERS
// ============================================================

function formatDate(value) {
    if (!value) {
        return EMPTY_VALUE;
    }

    // Already formatted CRM date
    if (
        typeof value === "string" &&
        /^\d{2}\/\d{2}\/\d{4}/.test(value)
    ) {
        return value;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    );
}


function formatDateTime(value) {
    if (!value) {
        return EMPTY_VALUE;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}


function formatInputDate(value) {
    if (!value) {
        return "";
    }

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return value;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date
        .toISOString()
        .slice(0, 10);
}


function formatInputDateTime(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date
        .toISOString()
        .slice(0, 16);
}


// ============================================================
// MAIN FIELD RENDERER
// ============================================================

export default function FieldRenderer({
    field,
    value,
    record,

    /*
     * view
     * edit
     */
    mode = "view",

    /*
     * Used by inline editing in view mode.
     */
    onSave,

    /*
     * Used by both modes.
     *
     * In edit mode this should normally update
     * EntityEditContext local state.
     */
    onChange,

    readOnly = false,
    hideLabel = false,

    className = "",
}) {
    if (!field) {
        return null;
    }


    // ========================================================
    // FIELD CONFIG
    // ========================================================

    const accessor =
        field.accessor ??
        field.key;

    const label =
        field.label ?? "";

    const type =
        field.type ?? "text";


    // ========================================================
    // MODE
    // ========================================================

    const isEditMode =
        mode === "edit";


    // ========================================================
    // EDITABLE
    // ========================================================

    /*
     * `mode="edit"` means:
     *
     *     render input by default
     *
     * But these still override it:
     *
     *     editable: false
     *     readonly: true
     *     readOnly: true
     */

    const editable =
        field.editable !== false &&
        field.readonly !== true &&
        readOnly !== true;


    // ========================================================
    // ACTUAL VALUE
    // ========================================================

    /*
     * If a source record is passed:
     *
     * record[accessor]
     *
     * Otherwise use the already resolved `value`.
     *
     * This allows your global value resolver to remain
     * responsible for nested sources.
     */

    const actualValue =
        record &&
            accessor &&
            record[accessor] !== undefined
            ? record[accessor]
            : value;


    // ========================================================
    // INLINE EDIT STATE
    // ========================================================

    /*
     * This state is ONLY relevant for:
     *
     * mode="view"
     *
     * In edit mode we force:
     *
     * editing = true
     */

    const [
        editing,
        setEditing,
    ] = useState(false);


    const [
        localValue,
        setLocalValue,
    ] = useState(
        normalizeValue(
            actualValue
        )
    );


    const inputRef =
        useRef(null);


    // ========================================================
    // EFFECTIVE EDITING STATE
    // ========================================================

    const isEditing =
        isEditMode
            ? editable
            : editing;


    // ========================================================
    // SYNC VALUE
    // ========================================================

    useEffect(() => {
        /*
         * In edit mode, keep local value synchronized
         * with the value supplied by the parent.
         *
         * This is useful when EntityEditContext updates
         * the value.
         */

        if (isEditMode) {
            setLocalValue(
                normalizeValue(
                    actualValue
                )
            );

            return;
        }


        /*
         * Normal view mode.
         *
         * Only sync when the field is not currently
         * being edited.
         */

        if (!editing) {
            setLocalValue(
                normalizeValue(
                    actualValue
                )
            );
        }
    }, [
        actualValue,
        editing,
        isEditMode,
    ]);


    // ========================================================
    // FOCUS INPUT
    // ========================================================

    useEffect(() => {
        if (
            isEditing &&
            inputRef.current
        ) {
            inputRef.current.focus();

            if (
                inputRef.current.select &&
                type !== "select" &&
                type !== "status" &&
                type !== "boolean" &&
                type !== "date" &&
                type !== "datetime"
            ) {
                inputRef.current.select();
            }
        }
    }, [
        isEditing,
        type,
    ]);


    // ========================================================
    // START EDITING
    // ========================================================

    const startEditing = () => {
        if (!editable) {
            return;
        }

        /*
         * In view mode this enables inline editing.
         *
         * In edit mode this isn't normally needed because
         * the field is already editable.
         */

        setLocalValue(
            normalizeValue(
                actualValue
            )
        );

        setEditing(true);
    };


    // ========================================================
    // CANCEL INLINE EDIT
    // ========================================================

    const cancelEditing = () => {
        /*
         * IMPORTANT:
         *
         * Edit page has no individual cancel button.
         *
         * Global Cancel/Reset is handled by EntityEditContext.
         */

        if (isEditMode) {
            return;
        }

        setLocalValue(
            normalizeValue(
                actualValue
            )
        );

        setEditing(false);
    };


    // ========================================================
    // VALIDATION
    // ========================================================

    const validate = (
        nextValue
    ) => {
        const validation =
            field.validation;

        if (!validation) {
            return null;
        }

        const stringValue =
            String(
                nextValue ?? ""
            );


        // ----------------------------------------------------
        // REQUIRED
        // ----------------------------------------------------

        if (
            validation.required &&
            !stringValue.trim()
        ) {
            return `${label} is required`;
        }


        // ----------------------------------------------------
        // MIN LENGTH
        // ----------------------------------------------------

        if (
            validation.minLength &&
            stringValue.length <
            validation.minLength
        ) {
            return `${label} must be at least ${validation.minLength} characters`;
        }


        // ----------------------------------------------------
        // MAX LENGTH
        // ----------------------------------------------------

        if (
            validation.maxLength &&
            stringValue.length >
            validation.maxLength
        ) {
            return `${label} must be less than ${validation.maxLength + 1
                } characters`;
        }

        return null;
    };


    // ========================================================
    // HANDLE VALUE CHANGE
    // ========================================================

    const handleChange = (
        nextValue
    ) => {
        /*
         * Update local field state.
         */

        setLocalValue(
            normalizeValue(
                nextValue
            )
        );


        /*
         * In edit mode:
         *
         * Do NOT call onSave.
         *
         * Parent should maintain the edit state.
         */

        if (onChange) {
            onChange(
                accessor,
                nextValue,
                field
            );
        }
    };


    // ========================================================
    // INLINE SAVE
    // ========================================================

    const save = async (
        overrideValue
    ) => {
        const newValue =
            overrideValue !== undefined
                ? overrideValue
                : localValue;

        const oldValue =
            normalizeValue(
                actualValue
            );


        // ----------------------------------------------------
        // VALIDATE
        // ----------------------------------------------------

        const validationError =
            validate(newValue);

        if (validationError) {
            console.warn(
                validationError
            );

            return;
        }


        // ----------------------------------------------------
        // NO CHANGE
        // ----------------------------------------------------

        if (
            String(newValue) ===
            String(oldValue)
        ) {
            setEditing(false);

            return;
        }


        // ----------------------------------------------------
        // UPDATE LOCAL/PARENT STATE
        // ----------------------------------------------------

        if (onChange) {
            onChange(
                accessor,
                newValue,
                field
            );
        }


        // ----------------------------------------------------
        // VIEW MODE ONLY
        // ----------------------------------------------------

        /*
         * IMPORTANT:
         *
         * In edit mode, API saving is NOT performed here.
         *
         * The EntityEditPage's global Save button will
         * submit all dirty fields.
         */

        if (
            !isEditMode &&
            onSave
        ) {
            try {
                await onSave(
                    accessor,
                    newValue,
                    field
                );

                setEditing(false);
            } catch (error) {
                console.error(
                    "Field update failed:",
                    error
                );
            }

            return;
        }


        /*
         * For edit mode:
         *
         * Keep field in edit mode.
         */

        if (isEditMode) {
            return;
        }

        setEditing(false);
    };


    // ========================================================
    // KEYBOARD
    // ========================================================

    const handleKeyDown = (
        event
    ) => {

        // ----------------------------------------------------
        // ESCAPE
        // ----------------------------------------------------

        /*
         * Escape only works for inline editing.
         *
         * Edit page uses global Cancel.
         */

        if (
            event.key === "Escape" &&
            !isEditMode
        ) {
            event.preventDefault();

            cancelEditing();

            return;
        }


        if (
            event.key === "Enter" &&
            type !== "textarea" &&
            !isEditMode
        ) {
            event.preventDefault();
            save()
        }
    };


    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div
            className={`
                group
                min-w-0
                flex items-center gap-2
                ${className}
            `}
        >

            {/* ==================================================
                LABEL
            ================================================== */}

            {!hideLabel && (
                <div
                    className="
                        text-[13px]
                        font-medium
                        text-slate-500
                        w-[20%]
                    "
                >
                    {label}

                    {field.required && (
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    )}
                </div>
            )}


            {/* ==================================================
                FIELD
            ================================================== */}

            <div
                /*
                 * Double click ONLY exists in view mode.
                 *
                 * Edit mode is already editable.
                 */
                onDoubleClick={
                    !isEditMode
                        ? startEditing
                        : undefined
                }
                className={`
                    relative
                    min-h-[38px]
                    rounded-md
                    transition

                    ${!isEditing &&
                        editable
                        ? `
                                cursor-pointer
                                hover:bg-slate-50
                            `
                        : ""
                    }

                    ${isEditMode &&
                        editable
                        ? `
                                cursor-text
                            `
                        : ""
                    }
                `}
            >

                {isEditing ? (
                    <EditField
                        field={field}
                        value={localValue}
                        setValue={
                            handleChange
                        }
                        inputRef={
                            inputRef
                        }
                        onSave={save}
                        onCancel={
                            cancelEditing
                        }
                        onKeyDown={
                            handleKeyDown
                        }

                        /*
                         * CRITICAL:
                         *
                         * View mode:
                         *     check/cross = true
                         *
                         * Edit mode:
                         *     check/cross = false
                         */
                        showActions={
                            !isEditMode
                        }
                    />
                ) : (
                    <DisplayField
                        field={field}
                        value={
                            actualValue
                        }
                        record={
                            record
                        }
                        editable={
                            editable
                        }
                    />
                )}

            </div>

        </div>
    );
}


// ============================================================
// DISPLAY FIELD
// ============================================================

function DisplayField({
    field,
    value,
    record,
    editable,
}) {
    const {
        type,
    } = field;


    // ========================================================
    // EMPTY
    // ========================================================

    if (isEmpty(value)) {
        return (
            <div
                className="
                    flex
                    min-h-[38px]
                    items-center
                    px-2
                    text-sm
                    text-slate-400
                "
            >
                <span>
                    {EMPTY_VALUE}
                </span>

                {editable && (
                    <Pencil
                        size={13}
                        className="
                            ml-auto
                            opacity-0
                            transition
                            group-hover:opacity-100
                        "
                    />
                )}
            </div>
        );
    }


    // ========================================================
    // TEXT
    // ========================================================

    if (
        type === "text" ||
        type === "textarea"
    ) {
        return (
            <DisplayWrapper
                editable={editable}
            >
                {String(value)}
            </DisplayWrapper>
        );
    }


    // ========================================================
    // EMAIL
    // ========================================================

    if (type === "email") {
        return (
            <div
                className="
                    flex
                    min-h-[38px]
                    items-center
                    gap-2
                    px-2
                "
            >
                <a
                    href={`mailto:${value}`}
                    className="
                        truncate
                        text-sm
                        text-blue-600
                        hover:underline
                    "
                >
                    {value}
                </a>

                <Mail
                    size={14}
                    className="
                        shrink-0
                        text-slate-400
                    "
                />

                {editable && (
                    <Pencil
                        size={13}
                        className="
                            ml-auto
                            shrink-0
                            opacity-0
                            transition
                            group-hover:opacity-100
                        "
                    />
                )}
            </div>
        );
    }


    // ========================================================
    // PHONE
    // ========================================================

    if (type === "phone") {
        return (
            <div
                className="
                    flex
                    min-h-[38px]
                    items-center
                    gap-2
                    px-2
                "
            >
                <a
                    href={`tel:${value}`}
                    className="
                        text-sm
                        text-slate-800
                    "
                >
                    {value}
                </a>

                <a
                    href={`tel:${value}`}
                    className="
                        flex
                        h-6
                        w-6
                        items-center
                        justify-center
                        rounded-md
                        bg-emerald-50
                        text-emerald-600
                    "
                >
                    <Phone size={13} />
                </a>

                {editable && (
                    <Pencil
                        size={13}
                        className="
                            ml-auto
                            opacity-0
                            transition
                            group-hover:opacity-100
                        "
                    />
                )}
            </div>
        );
    }


    // ========================================================
    // URL
    // ========================================================

    if (type === "url") {
        let href = String(value);

        if (
            !href.startsWith(
                "http://"
            ) &&
            !href.startsWith(
                "https://"
            )
        ) {
            href =
                `https://${href}`;
        }

        return (
            <div
                className="
                    flex
                    min-h-[38px]
                    items-center
                    gap-2
                    px-2
                "
            >
                <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="
                        truncate
                        text-sm
                        text-blue-600
                        hover:underline
                    "
                >
                    {value}
                </a>

                <ExternalLink
                    size={14}
                    className="
                        shrink-0
                        text-slate-400
                    "
                />

                {editable && (
                    <Pencil
                        size={13}
                        className="
                            ml-auto
                            opacity-0
                            transition
                            group-hover:opacity-100
                        "
                    />
                )}
            </div>
        );
    }


    // ========================================================
    // SELECT / STATUS
    // ========================================================

    if (
        type === "select" ||
        type === "status"
    ) {
        const label =
            getOptionLabel(
                field,
                value
            );

        if (
            type === "status"
        ) {
            return (
                <div
                    className="
                        flex
                        min-h-[38px]
                        items-center
                        px-2
                    "
                >
                    <span
                        className="
                            inline-flex
                            rounded-full
                            bg-blue-50
                            px-2.5
                            py-1
                            text-xs
                            font-medium
                            text-blue-700
                        "
                    >
                        {label}
                    </span>
                </div>
            );
        }

        return (
            <DisplayWrapper
                editable={editable}
            >
                {label}
            </DisplayWrapper>
        );
    }


    // ========================================================
    // BOOLEAN
    // ========================================================

    if (type === "boolean") {
        const active =
            isTruthy(value);

        return (
            <div
                className="
                    flex
                    min-h-[38px]
                    items-center
                    px-2
                "
            >
                <span
                    className={`
                        rounded-full
                        px-2.5
                        py-1
                        text-xs
                        font-medium

                        ${active
                            ? `
                                    bg-emerald-50
                                    text-emerald-700
                                `
                            : `
                                    bg-slate-100
                                    text-slate-500
                                `
                        }
                    `}
                >
                    {active
                        ? "Yes"
                        : "No"}
                </span>
            </div>
        );
    }


    // ========================================================
    // NUMBER
    // ========================================================

    if (type === "number") {
        return (
            <DisplayWrapper
                editable={editable}
            >
                {Number(
                    value
                ).toLocaleString(
                    "en-IN"
                )}
            </DisplayWrapper>
        );
    }


    // ========================================================
    // CURRENCY
    // ========================================================

    if (
        type === "currency"
    ) {
        return (
            <DisplayWrapper
                editable={editable}
            >
                ₹{" "}
                {Number(
                    value
                ).toLocaleString(
                    "en-IN"
                )}
            </DisplayWrapper>
        );
    }


    // ========================================================
    // PERCENT
    // ========================================================

    if (
        type === "percent"
    ) {
        return (
            <DisplayWrapper
                editable={editable}
            >
                {String(
                    value
                ).replace(
                    "%",
                    ""
                )}
                %
            </DisplayWrapper>
        );
    }


    // ========================================================
    // DATE
    // ========================================================

    if (type === "date") {
        return (
            <DisplayWrapper
                editable={editable}
            >
                {formatDate(value)}
            </DisplayWrapper>
        );
    }


    // ========================================================
    // DATETIME
    // ========================================================

    if (
        type === "datetime"
    ) {
        return (
            <DisplayWrapper
                editable={editable}
            >
                {formatDateTime(
                    value
                )}
            </DisplayWrapper>
        );
    }


    // ========================================================
    // USER
    // ========================================================

    if (type === "user") {
        return (
            <div
                className="
                    flex
                    min-h-[38px]
                    items-center
                    gap-2
                    px-2
                "
            >
                <div
                    className="
                        flex
                        h-7
                        w-7
                        items-center
                        justify-center
                        rounded-full
                        bg-slate-100
                        text-slate-500
                    "
                >
                    <User size={14} />
                </div>

                <span className="text-sm">
                    {value}
                </span>
            </div>
        );
    }


    // ========================================================
    // LOOKUP
    // ========================================================

    if (
        type === "lookup"
    ) {
        const lookupLabel =
            record?.[
            `${field.accessor}_name`
            ] ??
            record?.[
            field.lookupLabelField
            ] ??
            value;

        return (
            <DisplayWrapper
                editable={editable}
            >
                <span className="text-blue-600">
                    {lookupLabel}
                </span>
            </DisplayWrapper>
        );
    }


    // ========================================================
    // TAGS
    // ========================================================

    if (type === "tags") {
        const tags =
            Array.isArray(value)
                ? value
                : String(value)
                    .split(",")
                    .map(
                        (item) =>
                            item.trim()
                    )
                    .filter(Boolean);

        return (
            <div
                className="
                    flex
                    min-h-[38px]
                    flex-wrap
                    items-center
                    gap-1.5
                    px-2
                "
            >
                {tags.map(
                    (
                        tag,
                        index
                    ) => (
                        <span
                            key={`${tag}-${index}`}
                            className="
                                rounded-md
                                bg-blue-50
                                px-2
                                py-1
                                text-xs
                                font-medium
                                text-blue-700
                            "
                        >
                            {tag}
                        </span>
                    )
                )}
            </div>
        );
    }


    // ========================================================
    // RATING
    // ========================================================

    if (
        type === "rating"
    ) {
        const rating =
            Math.min(
                5,
                Math.max(
                    0,
                    Number(value) ||
                    0
                )
            );

        return (
            <div
                className="
                    flex
                    min-h-[38px]
                    items-center
                    gap-0.5
                    px-2
                "
            >
                {[1, 2, 3, 4, 5].map(
                    (star) => (
                        <Star
                            key={star}
                            size={16}
                            fill={
                                star <=
                                    rating
                                    ? "currentColor"
                                    : "none"
                            }
                            className={
                                star <=
                                    rating
                                    ? "text-amber-400"
                                    : "text-slate-300"
                            }
                        />
                    )
                )}
            </div>
        );
    }


    // ========================================================
    // FALLBACK
    // ========================================================

    return (
        <DisplayWrapper
            editable={editable}
        >
            {String(value)}
        </DisplayWrapper>
    );
}


// ============================================================
// DISPLAY WRAPPER
// ============================================================

function DisplayWrapper({
    children,
    editable,
}) {
    return (
        <div
            className="
                flex
                min-h-[38px]
                items-center
                px-2
                text-sm
                text-slate-800
            "
        >
            <span className="break-words">
                {children}
            </span>

            {editable && (
                <Pencil
                    size={13}
                    className="
                        ml-auto
                        shrink-0
                        text-slate-400
                        opacity-0
                        transition
                        group-hover:opacity-100
                    "
                />
            )}
        </div>
    );
}


// ============================================================
// EDIT FIELD
// ============================================================

function EditField({
    field,
    value,
    setValue,
    inputRef,
    onSave,
    onCancel,
    onKeyDown,
    showActions = true,
}) {
    const {
        type,
        placeholder,
        options = [],
    } = field;


    const inputClass = `
        w-full
        rounded-md
        border
        border-blue-300
        bg-white
        px-2.5
        py-2
        ${showActions
            ? "pr-[68px]"
            : "pr-2.5"
        }
        text-sm
        text-slate-800
        outline-none
        ring-2
        ring-blue-50
        focus:border-blue-500
    `;


    // ========================================================
    // TEXTAREA
    // ========================================================

    if (
        type === "textarea"
    ) {
        return (
            <div className="relative">
                <textarea
                    ref={inputRef}
                    value={value}
                    placeholder={
                        placeholder
                    }
                    onChange={(event) =>
                        setValue(
                            event.target.value
                        )
                    }
                    onKeyDown={onKeyDown}
                    rows={4}
                    className={`
                        ${inputClass}
                        pr-2
                    `}
                />

                {showActions && (
                    <EditActions
                        onSave={onSave}
                        onCancel={
                            onCancel
                        }
                    />
                )}
            </div>
        );
    }


    // ========================================================
    // SELECT
    // ========================================================

    if (
        type === "select" ||
        type === "status"
    ) {
        return (
            <div className="relative">

                <select
                    ref={inputRef}
                    value={value}
                    onChange={(event) => {
                        setValue(
                            event.target
                                .value
                        );
                    }}
                    className={`
                        ${inputClass}
                        appearance-none
                    `}
                >
                    <option value="">
                        Select{" "}
                        {field.label}
                    </option>

                    {options.map(
                        (option) => (
                            <option
                                key={
                                    option.value
                                }
                                value={
                                    option.value
                                }
                            >
                                {
                                    option.label
                                }
                            </option>
                        )
                    )}
                </select>

                <ChevronDown
                    size={16}
                    className={`
                        pointer-events-none
                        absolute
                        ${showActions
                            ? "right-[68px]"
                            : "right-3"
                        }
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                    `}
                />

                {showActions && (
                    <EditActions
                        onSave={onSave}
                        onCancel={
                            onCancel
                        }
                    />
                )}

            </div>
        );
    }


    // ========================================================
    // BOOLEAN
    // ========================================================

    if (
        type === "boolean"
    ) {
        const checked =
            isTruthy(value);

        return (
            <div
                className="
                    relative
                    flex
                    min-h-[40px]
                    items-center
                    rounded-md
                    border
                    border-blue-300
                    bg-white
                    px-3
                "
            >
                <label
                    className="
                        flex
                        cursor-pointer
                        items-center
                        gap-3
                    "
                >
                    <input
                        ref={inputRef}
                        type="checkbox"
                        checked={
                            checked
                        }
                        onChange={(
                            event
                        ) =>
                            setValue(
                                event
                                    .target
                                    .checked
                                    ? "1"
                                    : "0"
                            )
                        }
                        className="
                            h-4
                            w-4
                            accent-blue-600
                        "
                    />

                    <span className="text-sm">
                        {checked
                            ? "Yes"
                            : "No"}
                    </span>
                </label>

                {showActions && (
                    <EditActions
                        onSave={onSave}
                        onCancel={
                            onCancel
                        }
                    />
                )}
            </div>
        );
    }


    // ========================================================
    // NUMBER / CURRENCY / PERCENT
    // ========================================================

    if (
        type === "number" ||
        type === "currency" ||
        type === "percent"
    ) {
        return (
            <EditInput
                ref={inputRef}
                type="number"
                value={String(
                    value ?? ""
                ).replace(
                    "%",
                    ""
                )}
                placeholder={
                    placeholder
                }
                onChange={setValue}
                onSave={onSave}
                onCancel={onCancel}
                onKeyDown={onKeyDown}
                className={
                    inputClass
                }
                showActions={
                    showActions
                }
            />
        );
    }


    // ========================================================
    // DATE
    // ========================================================

    if (type === "date") {
        return (
            <EditInput
                ref={inputRef}
                type="date"
                value={formatInputDate(
                    value
                )}
                onChange={setValue}
                onSave={onSave}
                onCancel={onCancel}
                onKeyDown={onKeyDown}
                className={
                    inputClass
                }
                showActions={
                    showActions
                }
            />
        );
    }


    // ========================================================
    // DATETIME
    // ========================================================

    if (
        type === "datetime"
    ) {
        return (
            <EditInput
                ref={inputRef}
                type="datetime-local"
                value={formatInputDateTime(
                    value
                )}
                onChange={setValue}
                onSave={onSave}
                onCancel={onCancel}
                onKeyDown={onKeyDown}
                className={
                    inputClass
                }
                showActions={
                    showActions
                }
            />
        );
    }


    // ========================================================
    // EMAIL
    // ========================================================

    if (
        type === "email"
    ) {
        return (
            <EditInput
                ref={inputRef}
                type="email"
                value={value}
                placeholder={
                    placeholder
                }
                onChange={setValue}
                onSave={onSave}
                onCancel={onCancel}
                onKeyDown={onKeyDown}
                className={
                    inputClass
                }
                showActions={
                    showActions
                }
            />
        );
    }


    // ========================================================
    // PHONE
    // ========================================================

    if (
        type === "phone"
    ) {
        return (
            <EditInput
                ref={inputRef}
                type="tel"
                value={value}
                placeholder={
                    placeholder
                }
                onChange={setValue}
                onSave={onSave}
                onCancel={onCancel}
                onKeyDown={onKeyDown}
                className={
                    inputClass
                }
                showActions={
                    showActions
                }
            />
        );
    }


    // ========================================================
    // URL
    // ========================================================

    if (type === "url") {
        return (
            <EditInput
                ref={inputRef}
                type="url"
                value={value}
                placeholder={
                    placeholder ||
                    "https://..."
                }
                onChange={setValue}
                onSave={onSave}
                onCancel={onCancel}
                onKeyDown={onKeyDown}
                className={
                    inputClass
                }
                showActions={
                    showActions
                }
            />
        );
    }


    // ========================================================
    // TAGS
    // ========================================================

    if (type === "tags") {
        const tagValue =
            Array.isArray(value)
                ? value.join(", ")
                : value;

        return (
            <EditInput
                ref={inputRef}
                type="text"
                value={
                    tagValue ?? ""
                }
                placeholder={
                    placeholder ||
                    "tag1, tag2"
                }
                onChange={setValue}
                onSave={onSave}
                onCancel={onCancel}
                onKeyDown={onKeyDown}
                className={
                    inputClass
                }
                showActions={
                    showActions
                }
            />
        );
    }


    // ========================================================
    // DEFAULT TEXT
    // ========================================================

    return (
        <EditInput
            ref={inputRef}
            type="text"
            value={
                value ?? ""
            }
            placeholder={
                placeholder
            }
            onChange={setValue}
            onSave={onSave}
            onCancel={onCancel}
            onKeyDown={onKeyDown}
            className={
                inputClass
            }
            showActions={
                showActions
            }
        />
    );
}


// ============================================================
// EDIT INPUT
// ============================================================

const EditInput = forwardRef(
    function EditInput(
        {
            type,
            value,
            placeholder,
            onChange,
            onSave,
            onCancel,
            onKeyDown,
            className,
            showActions = true,
            ...props
        },
        ref
    ) {
        return (
            <div className="relative">

                <input
                    ref={ref}
                    type={type}
                    value={value}
                    placeholder={
                        placeholder
                    }
                    onChange={(event) =>
                        onChange(
                            event.target
                                .value
                        )
                    }
                    onKeyDown={onKeyDown}
                    className={
                        className
                    }
                    {...props}
                />

                {showActions && (
                    <EditActions
                        onSave={onSave}
                        onCancel={
                            onCancel
                        }
                    />
                )}

            </div>
        );
    }
);


// ============================================================
// EDIT ACTIONS
// ============================================================

function EditActions({
    onSave,
    onCancel,
}) {
    return (
        <div
            className="
                absolute
                right-1
                top-1/2
                z-10
                flex
                -translate-y-1/2
                items-center
                gap-1
                rounded
                bg-white
                pl-1
            "
        >

            {/* ==================================================
                SAVE
            ================================================== */}

            <button
                type="button"
                onMouseDown={(
                    event
                ) => {
                    /*
                     * Prevent input blur before save.
                     */
                    event.preventDefault();

                    onSave();
                }}
                className="
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center
                    rounded
                    text-emerald-600
                    hover:bg-emerald-50
                "
                title="Save"
            >
                {/* Check icon intentionally exists
                    ONLY in view/inline-edit mode. */}
                <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            </button>


            {/* ==================================================
                CANCEL
            ================================================== */}

            <button
                type="button"
                onMouseDown={(
                    event
                ) => {
                    event.preventDefault();

                    onCancel();
                }}
                className="
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center
                    rounded
                    text-slate-500
                    hover:bg-slate-100
                "
                title="Cancel"
            >
                {/* X icon intentionally exists
                    ONLY in view/inline-edit mode. */}
                <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                </svg>
            </button>

        </div>
    );
}