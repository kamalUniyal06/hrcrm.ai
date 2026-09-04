import {
    ArrowUpDown,
    ChevronDown,
    Check,
    X,
} from "lucide-react";
import { useDispatch } from "react-redux";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    AnimatePresence,
    motion,
} from "framer-motion";

import { useTableContext } from "./Table";
import IconButton from "../Buttons/IconButton";
import { preferencesAction } from "../../../store/Slices/preferencesSlice";

function SortDropdown() {
    const { visibleColumns, sorting, slice } =
        useTableContext();

    const dispatch = useDispatch();

    const getCurrentSorting = () => ({
        column: sorting?.order_by || null,
        direction:
            sorting?.order_dir || "DESC",
    });

    const [sort, setSort] = useState(
        getCurrentSorting()
    );

    const [open, setOpen] =
        useState(false);

    const wrapperRef = useRef(null);
    const hasActiveSort = sort?.column;
    useEffect(() => {
        const handleOutside = (e) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(
                    e.target
                )
            ) {
                setSort(
                    getCurrentSorting()
                );

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
    }, [sorting]);
    useEffect(() => {
        setSort(getCurrentSorting());
    }, [
        sorting?.order_by,
        sorting?.order_dir,
    ]);
    // SORTABLE COLUMNS
    const sortableColumns =
        useMemo(() => {
            return (
                visibleColumns?.filter(
                    (column) =>
                        column?.accessor &&
                        column?.sortable
                ) || []
            );
        }, [visibleColumns]);

    const selectedColumn =
        sortableColumns.find(
            (c) =>
                c.accessor ===
                sort?.column
        );

    const sortDirection =
        sort?.direction ||
        "ASC";

    const handleApply = () => {
        dispatch(
            preferencesAction.updateTablePreference(
                {
                    table: slice,
                    key: "sorting",
                    value: {
                        order_by:
                            sort.column || "",
                        order_dir:
                            sort.direction ||
                            "DESC",
                    },
                }
            )
        );

        setOpen(false);
    };

    const handleReset = () => {
        setSort(
            getCurrentSorting()
        );

        setOpen(false);
    };

    return (
        <div
            ref={wrapperRef}
            className="relative"
        >
            <div className="relative">
                <IconButton
                    icon={ArrowUpDown}
                    className={`
            rounded-lg border transition
            flex items-center justify-center

            ${hasActiveSort
                            ? "border-blue-600 bg-blue-300 text-blue-600"
                            : "bg-white hover:bg-gray-100"
                        }
        `}
                    onClick={() => {
                        if (!open) {
                            setSort(
                                getCurrentSorting()
                            );
                        }

                        setOpen((prev) => !prev);
                    }}
                    textClassName="text-xs text-blue-600"
                    label="Sort Table"
                    iconColor={
                        hasActiveSort
                            ? "blue"
                            : "black"
                    }
                />

                {hasActiveSort && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();

                            dispatch(
                                preferencesAction.updateTablePreference(
                                    {
                                        table: slice,
                                        key: "sorting",
                                        value: {
                                            order_by: "",
                                            order_dir:
                                                "DESC",
                                        },
                                    }
                                )
                            );

                            setSort({
                                column: null,
                                direction:
                                    "DESC",
                            });
                        }}
                        className="
                        absolute
                        -top-1
                        right-0

                h-4
                w-4
                rounded-lg
                border
                border-red-200
                bg-red-50
                text-red-500
                flex
                items-center
                justify-center
                hover:bg-red-100
                transition-all
            "
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* DROPDOWN */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{
                            opacity: 0,
                            y: -8,
                            scale: 0.98,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                        }}
                        exit={{
                            opacity: 0,
                            y: -8,
                            scale: 0.98,
                        }}
                        transition={{
                            duration: 0.18,
                        }}
                        className="
                            absolute
                            top-[115%]
                            left-0
                            z-[9999]
                            w-[340px]
                        "
                    >
                        <div
                            className="
                                overflow-hidden
                                rounded-2xl
                                border
                                border-gray-200
                                bg-white
                                shadow-[0_20px_50px_rgba(0,0,0,0.12)]
                            "
                        >
                            {/* HEADER */}
                            <div
                                className="
                                    px-5
                                    py-4
                                    border-b
                                    border-gray-100
                                "
                            >
                                <h3
                                    className="
                                        text-sm
                                        font-semibold
                                        text-gray-800
                                    "
                                >
                                    Sort By
                                </h3>
                            </div>

                            {/* BODY */}
                            <div className="p-5 space-y-4">
                                {/* COLUMN SELECT */}
                                <div>
                                    <label
                                        className="
                                            text-xs
                                            font-medium
                                            text-gray-500
                                            mb-2
                                            block
                                        "
                                    >
                                        Column
                                    </label>

                                    <div className="relative">
                                        <select
                                            value={
                                                sort?.column ||
                                                ""
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setSort(
                                                    (
                                                        prev
                                                    ) => ({
                                                        ...prev,

                                                        column:
                                                            e
                                                                .target
                                                                .value ||
                                                            null,
                                                    })
                                                )
                                            }
                                            className="
                                                appearance-none
                                                w-full
                                                h-11
                                                rounded-xl
                                                border
                                                border-gray-200
                                                bg-gray-50
                                                px-4
                                                pr-10
                                                text-sm
                                                text-gray-700
                                                outline-none
                                                transition-all

                                                focus:border-blue-400
                                                focus:bg-white
                                                focus:ring-4
                                                focus:ring-blue-100
                                            "
                                        >
                                            <option value="">
                                                None
                                            </option>

                                            {sortableColumns.map(
                                                (
                                                    column
                                                ) => (
                                                    <option
                                                        key={
                                                            column.accessor
                                                        }
                                                        value={
                                                            column.accessor
                                                        }
                                                    >
                                                        {
                                                            column.label
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </select>

                                        <ChevronDown
                                            className="
                                                absolute
                                                right-3
                                                top-1/2
                                                -translate-y-1/2
                                                w-4
                                                h-4
                                                text-gray-400
                                                pointer-events-none
                                            "
                                        />
                                    </div>
                                </div>

                                {/* DIRECTION */}
                                <div>
                                    <label
                                        className="
                                            text-xs
                                            font-medium
                                            text-gray-500
                                            mb-2
                                            block
                                        "
                                    >
                                        Direction
                                    </label>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() =>
                                                setSort(
                                                    (
                                                        prev
                                                    ) => ({
                                                        ...prev,

                                                        direction:
                                                            "ASC",
                                                    })
                                                )
                                            }
                                            className={`
                                                flex
                                                items-center
                                                justify-center
                                                gap-2
                                                h-11
                                                rounded-xl
                                                border
                                                text-sm
                                                font-medium
                                                transition-all

                                                ${sortDirection ===
                                                    "ASC"
                                                    ? "bg-blue-600 border-blue-600 text-white"
                                                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                                                }
                                            `}
                                        >
                                            Ascending

                                            {sortDirection ===
                                                "ASC" && (
                                                    <Check className="w-4 h-4" />
                                                )}
                                        </button>

                                        <button
                                            onClick={() =>
                                                setSort(
                                                    (
                                                        prev
                                                    ) => ({
                                                        ...prev,

                                                        direction:
                                                            "DESC",
                                                    })
                                                )
                                            }
                                            className={`
                                                flex
                                                items-center
                                                justify-center
                                                gap-2
                                                h-11
                                                rounded-xl
                                                border
                                                text-sm
                                                font-medium
                                                transition-all

                                                ${sortDirection ===
                                                    "DESC"
                                                    ? "bg-blue-600 border-blue-600 text-white"
                                                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                                                }
                                            `}
                                        >
                                            Descending

                                            {sortDirection ===
                                                "DESC" && (
                                                    <Check className="w-4 h-4" />
                                                )}
                                        </button>
                                    </div>
                                </div>

                            </div>

                            {/* FOOTER */}
                            <div
                                className="
                                    flex
                                    items-center
                                    justify-end
                                    gap-2
                                    px-5
                                    py-4
                                    border-t
                                    border-gray-100
                                    bg-gray-50
                                "
                            >
                                <button
                                    onClick={
                                        handleReset
                                    }
                                    className="
                                        px-4
                                        py-2
                                        rounded-xl
                                        border
                                        border-gray-200
                                        bg-white
                                        text-sm
                                        font-medium
                                        text-gray-700
                                        hover:bg-gray-50
                                        transition-all
                                    "
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={
                                        handleApply
                                    }
                                    className="
                                        px-4
                                        py-2
                                        rounded-xl
                                        bg-blue-600
                                        hover:bg-blue-700
                                        text-white
                                        text-sm
                                        font-medium
                                        shadow-sm
                                        transition-all
                                    "
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SortDropdown;