import {
    Search,
    Check,
    X,
    Columns3,
} from "lucide-react";

import {
    useMemo,
    useRef,
    useState,
    useEffect,
} from "react";

import {
    AnimatePresence,
    motion,
} from "framer-motion";

import { useTableContext } from "./Table";

function SearchBar() {
    const {
        search,
        setSearch,
        visibleColumns,
    } = useTableContext();

    // ---------------------------------------------------------
    // INITIAL LOCAL STATE
    // ---------------------------------------------------------

    const [searchValue, setSearchValue] = useState(
        search?.search || ""
    );

    const [selectedColumns, setSelectedColumns] =
        useState(
            Array.isArray(search?.search_fields)
                ? search.search_fields
                : []
        );

    const wrapperRef = useRef(null);

    const [open, setOpen] = useState(false);

    /*
     * Keeps track of the last value that THIS component
     * pushed into the context.
     *
     * This prevents:
     *
     * local state -> context -> local state -> context
     *
     * loops.
     */
    const lastPushedSearchRef = useRef({
        search: search?.search || "",
        search_fields: Array.isArray(
            search?.search_fields
        )
            ? [...search.search_fields]
            : [],
    });

    // ---------------------------------------------------------
    // SEARCHABLE COLUMNS
    // ---------------------------------------------------------

    const searchableColumns = useMemo(() => {
        return (
            visibleColumns?.filter(
                (column) =>
                    column?.accessor &&
                    column?.searchable === true
            ) || []
        );
    }, [visibleColumns]);

    // ---------------------------------------------------------
    // EXPAND SEARCH
    // ---------------------------------------------------------

    const expanded =
        selectedColumns.length > 0;

    // ---------------------------------------------------------
    // OUTSIDE CLICK
    // ---------------------------------------------------------

    useEffect(() => {
        const handleOutside = (e) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(
                    e.target
                )
            ) {
                setOpen(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutside
            );
        };
    }, []);

    // ---------------------------------------------------------
    // TOGGLE COLUMN
    // ---------------------------------------------------------

    const toggleColumn = (accessor) => {
        setSelectedColumns((prev) => {
            if (prev.includes(accessor)) {
                return prev.filter(
                    (item) => item !== accessor
                );
            }

            return [...prev, accessor];
        });
    };

    // ---------------------------------------------------------
    // REMOVE COLUMN
    // ---------------------------------------------------------

    const removeColumn = (accessor) => {
        setSelectedColumns((prev) =>
            prev.filter(
                (column) => column !== accessor
            )
        );
    };

    // ---------------------------------------------------------
    // CLEAR COLUMNS
    // ---------------------------------------------------------

    const clearColumns = () => {
        setSelectedColumns([]);
    };

    // ---------------------------------------------------------
    // UPDATE TABLE SEARCH
    //
    // IMPORTANT:
    // There is NO dependency on the `search` object here.
    //
    // The old implementation had:
    //
    //     [searchValue, selectedColumns]
    //
    // and blindly called setSearch().
    //
    // Since setSearch can cause the context to create a new
    // search object, this could trigger the other effect
    // again and create an infinite update loop.
    //
    // We only update context when the actual values changed.
    // ---------------------------------------------------------

    useEffect(() => {
        const timer = setTimeout(() => {
            const value = searchValue.trim();

            const nextFields = Array.isArray(
                selectedColumns
            )
                ? selectedColumns
                : [];

            const last =
                lastPushedSearchRef.current;

            const sameSearch =
                last.search === value;

            const sameFields =
                last.search_fields.length ===
                nextFields.length &&
                last.search_fields.every(
                    (item, index) =>
                        item === nextFields[index]
                );

            // Nothing changed since our last update.
            if (
                sameSearch &&
                sameFields
            ) {
                return;
            }

            // Remember what we are pushing.
            lastPushedSearchRef.current = {
                search: value,
                search_fields: [...nextFields],
            };

            setSearch((prev) => ({
                ...prev,
                search: value,
                search_fields: [...nextFields],
            }));
        }, 500);

        return () => {
            clearTimeout(timer);
        };
    }, [
        searchValue,
        selectedColumns,
    ]);

    // ---------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------

    return (
        <div
            ref={wrapperRef}
            className="relative w-full min-w-0 lg:w-auto"
        >
            {/* SEARCH WRAPPER */}
            <motion.div
                layout
                transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 24,
                }}
                className={`
                    flex
                    items-center
                    gap-2
                    min-h-10
                    px-2
                    py-1
                    rounded-xl
                    border
                    bg-white/90
                    backdrop-blur-xl
                    shadow-sm
                    transition-all
                    duration-300

                    ${expanded
                        ? "w-full lg:w-[520px] border-blue-100 shadow-[0_10px_30px_rgba(59,130,246,0.08)]"
                        : "w-full lg:w-[160px] border-gray-200 hover:border-gray-300"
                    }
                `}
            >
                {/* SEARCH ICON */}
                <div
                    className={`
                        flex
                        items-center
                        justify-center
                        w-8
                        h-8
                        rounded-xl
                        transition-all
                        shrink-0

                        ${expanded
                            ? "bg-blue-50 text-blue-600"
                            : "bg-gray-100 text-gray-500"
                        }
                    `}
                >
                    <Search className="w-4 h-4" />
                </div>

                {/* TAGS + INPUT */}
                <div
                    className="
                        flex
                        flex-wrap
                        items-center
                        gap-1.5
                        flex-1
                        py-1
                        max-h-[88px]
                        overflow-y-auto
                        overflow-x-hidden
                        scrollbar-thin
                        scrollbar-thumb-gray-200
                        scrollbar-track-transparent
                    "
                >
                    {/* TAGS */}
                    <AnimatePresence>
                        {selectedColumns.map(
                            (accessor) => {
                                const column =
                                    searchableColumns.find(
                                        (c) =>
                                            c.accessor ===
                                            accessor
                                    );

                                if (!column) {
                                    return null;
                                }

                                const Icon =
                                    column.icon;

                                return (
                                    <motion.div
                                        key={accessor}
                                        layout
                                        initial={{
                                            opacity: 0,
                                            scale: 0.8,
                                            y: 4,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            scale: 1,
                                            y: 0,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            scale: 0.8,
                                        }}
                                        transition={{
                                            duration: 0.18,
                                        }}
                                        className="
                                            flex
                                            items-center
                                            gap-1.5
                                            h-8
                                            px-2.5
                                            rounded-xl
                                            bg-blue-50
                                            border
                                            border-blue-100
                                            text-blue-700
                                            text-xs
                                            font-medium
                                            shrink-0
                                        "
                                    >
                                        {Icon && (
                                            <Icon className="w-3.5 h-3.5" />
                                        )}

                                        <span className="whitespace-nowrap">
                                            {
                                                column.label
                                            }
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeColumn(
                                                    accessor
                                                )
                                            }
                                            className="
                                                flex
                                                items-center
                                                justify-center
                                                w-4
                                                h-4
                                                rounded-full
                                                hover:bg-blue-100
                                                transition
                                            "
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </motion.div>
                                );
                            }
                        )}
                    </AnimatePresence>

                    {/* INPUT */}
                    <AnimatePresence>
                        {expanded && (
                            <motion.input
                                initial={{
                                    opacity: 0,
                                    width: 0,
                                }}
                                animate={{
                                    opacity: 1,
                                    width: "100%",
                                }}
                                exit={{
                                    opacity: 0,
                                    width: 0,
                                }}
                                transition={{
                                    duration: 0.2,
                                }}
                                type="text"
                                value={searchValue}
                                onChange={(e) => {
                                    setSearchValue(
                                        e.target.value
                                    );
                                }}
                                placeholder="Search..."
                                className="
                                    flex-1
                                    min-w-[100px]
                                    bg-transparent
                                    z-[999]
                                    text-sm
                                    text-gray-700
                                    placeholder:text-gray-400
                                    focus:outline-none
                                "
                            />
                        )}
                    </AnimatePresence>

                    {/* EMPTY PLACEHOLDER */}
                    {!expanded && (
                        <motion.span
                            initial={{
                                opacity: 0,
                            }}
                            animate={{
                                opacity: 1,
                            }}
                            exit={{
                                opacity: 0,
                            }}
                            className="
                                text-sm
                                text-gray-400
                                whitespace-nowrap
                            "
                        >
                            Search
                        </motion.span>
                    )}
                </div>

                {/* COLUMN BUTTON */}
                <button
                    type="button"
                    onClick={() =>
                        setOpen(
                            (prev) => !prev
                        )
                    }
                    className={`
                        flex
                        items-center
                        justify-center
                        w-8
                        h-8
                        rounded-xl
                        transition-all
                        shrink-0

                        ${open
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-500 hover:bg-gray-100"
                        }
                    `}
                >
                    <Columns3 className="w-4 h-4" />
                </button>
            </motion.div>

            {/* DROPDOWN */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{
                            opacity: 0,
                            y: -6,
                            scale: 0.96,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                        }}
                        exit={{
                            opacity: 0,
                            y: -6,
                            scale: 0.96,
                        }}
                        transition={{
                            duration: 0.16,
                        }}
                        className="
                            absolute
                            top-[115%]
                            right-0
                            z-[999]
                            w-[260px]
                            max-w-[calc(100vw_-_2rem)]
                        "
                    >
                        <div
                            className="
                                overflow-hidden
                                rounded-2xl
                                border
                                border-gray-200
                                bg-white
                                shadow-[0_20px_40px_rgba(0,0,0,0.12)]
                            "
                        >
                            {/* HEADER */}
                            <div
                                className="
                                    flex
                                    items-center
                                    justify-between
                                    px-4
                                    py-3
                                    border-b
                                    border-gray-100
                                "
                            >
                                <div>
                                    <h3
                                        className="
                                            text-sm
                                            font-semibold
                                            text-gray-800
                                        "
                                    >
                                        Search Columns
                                    </h3>

                                    <p
                                        className="
                                            text-xs
                                            text-gray-400
                                            mt-0.5
                                        "
                                    >
                                        Select columns
                                    </p>
                                </div>

                                {selectedColumns.length >
                                    0 && (
                                        <button
                                            type="button"
                                            onClick={
                                                clearColumns
                                            }
                                            className="
                                            text-xs
                                            font-medium
                                            text-blue-600
                                            hover:text-blue-700
                                        "
                                        >
                                            Clear
                                        </button>
                                    )}
                            </div>

                            {/* COLUMN LIST */}
                            <div
                                className="
                                    p-2
                                    max-h-[300px]
                                    overflow-y-auto
                                "
                            >
                                {searchableColumns.map(
                                    (column) => {
                                        const active =
                                            selectedColumns.includes(
                                                column.accessor
                                            );

                                        const Icon =
                                            column.icon;

                                        return (
                                            <button
                                                type="button"
                                                key={
                                                    column.accessor
                                                }
                                                onClick={() =>
                                                    toggleColumn(
                                                        column.accessor
                                                    )
                                                }
                                                className={`
                                                    w-full
                                                    flex
                                                    items-center
                                                    justify-between
                                                    px-3
                                                    py-2.5
                                                    rounded-xl
                                                    text-sm
                                                    transition-all

                                                    ${active
                                                        ? "bg-blue-50 text-blue-700"
                                                        : "hover:bg-gray-50 text-gray-700"
                                                    }
                                                `}
                                            >
                                                <div
                                                    className="
                                                        flex
                                                        items-center
                                                        gap-3
                                                    "
                                                >
                                                    <div
                                                        className={`
                                                            flex
                                                            items-center
                                                            justify-center
                                                            w-8
                                                            h-8
                                                            rounded-lg

                                                            ${active
                                                                ? "bg-blue-100"
                                                                : "bg-gray-100"
                                                            }
                                                        `}
                                                    >
                                                        {Icon ? (
                                                            <Icon className="w-4 h-4" />
                                                        ) : (
                                                            <Columns3 className="w-4 h-4" />
                                                        )}
                                                    </div>

                                                    <span className="font-medium">
                                                        {
                                                            column.label
                                                        }
                                                    </span>
                                                </div>

                                                {active && (
                                                    <Check className="w-4 h-4" />
                                                )}
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SearchBar;