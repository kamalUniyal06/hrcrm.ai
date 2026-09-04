import {
    ChevronDown,
    ChevronRight,
    Search,
} from "lucide-react";

import { motion } from "framer-motion";

import {
    useMemo,
    useState,
} from "react";

import { useTableContext } from "./Table";
import { useIsDesktop } from "../../../hooks/useMediaQuery";

const FilterColumn = () => {
    const {
        tableName,
        filterColumns,
        filters,
        setFilters,
    } = useTableContext();
    // Below `lg` the panel stacks above the table and spans the full width;
    // from `lg` up it's a fixed 280px column beside the table.
    const isDesktop = useIsDesktop();
    const openWidth = isDesktop ? 280 : "100%";
    const [search, setSearch] =
        useState("");

    const [expanded, setExpanded] =
        useState({});

    // FILTER SEARCH
    const filteredColumns =
        useMemo(() => {
            if (!search)
                return (
                    filterColumns || []
                );

            return (
                filterColumns?.filter(
                    (filter) =>
                        filter.label
                            .toLowerCase()
                            .includes(
                                search.toLowerCase()
                            )
                ) || []
            );
        }, [
            search,
            filterColumns,
        ]);

    // TOGGLE PARENT
    const toggleParent =
        (accessor) => {
            setExpanded((prev) => ({
                ...prev,

                [accessor]:
                    !prev[
                    accessor
                    ],
            }));
        };

    // SELECT RADIO
    const handleSelect = (
        accessor,
        value
    ) => {
        console.log("filters", filters)
        setFilters({
            ...filters,
            [accessor]: value,
        });
    };
    return (
        <motion.div
            initial={{
                width: 0,
                opacity: 0,
            }}
            animate={{
                width: openWidth,
                opacity: 1,
            }}
            exit={{
                width: 0,
                opacity: 0,
            }}
            transition={{
                duration: 0.2,
            }}
            className="
                w-full
                max-w-full
                lg:min-w-[280px]
                lg:max-w-[280px]
                lg:h-full
                bg-white
                border
                border-gray-200
                rounded-2xl
                shadow-sm
                overflow-hidden
                flex
                flex-col
                relative
            "
        >
            {/* HEADER */}
            <div
                className="
                    p-4
                    border-b
                    border-gray-100
                    bg-white
                    shrink-0
                "
            >
                <h2
                    className="
                        font-semibold
                        text-[16px]
                        text-gray-800
                    "
                >
                    Filter {tableName}
                </h2>

                {/* SEARCH */}
                <div className="relative mt-4">
                    <Search
                        className="
                            absolute
                            left-3
                            top-1/2
                            -translate-y-1/2
                            w-4
                            h-4
                            text-gray-400
                        "
                    />

                    <input
                        type="text"
                        value={search}
                        onChange={(
                            e
                        ) =>
                            setSearch(
                                e.target
                                    .value
                            )
                        }
                        placeholder="Search filters..."
                        className="
                            w-full
                            h-10
                            pl-10
                            pr-3
                            rounded-xl
                            border
                            border-gray-200
                            bg-gray-50
                            text-sm
                            outline-none
                            transition-all

                            focus:bg-white
                            focus:border-blue-400
                            focus:ring-4
                            focus:ring-blue-100
                        "
                    />
                </div>
            </div>

            {/* FILTER LIST */}
            <div
                className="
                    flex-1
                    overflow-y-auto
                    overflow-x-hidden
                    p-2
                    flex
                    flex-col
                    gap-2
                        max-h-[500px]
                    scrollbar-thin
                    scrollbar-thumb-gray-200
                    scrollbar-track-transparent
                "
            >
                {filteredColumns.map(
                    (filter) => {
                        const isExpanded =
                            expanded[
                            filter
                                .accessor
                            ];

                        return (
                            <div
                                key={
                                    filter.accessor
                                }
                                className="
                                    rounded-2xl
                                    border
                                    border-gray-100
                                    overflow-hidden
                                    bg-white
                                    shrink-0
                                "
                            >
                                {/* PARENT */}
                                <button
                                    onClick={(
                                        e
                                    ) => {
                                        if (
                                            e
                                                .target
                                                .tagName ===
                                            "INPUT"
                                        )
                                            return;

                                        toggleParent(
                                            filter.accessor
                                        );
                                    }}
                                    className={`
                                        w-full
                                        flex
                                        items-center
                                        justify-between
                                        px-3
                                        py-3
                                        text-sm
                                        font-medium
                                        transition-all

                                        ${isExpanded
                                            ? "bg-blue-50 text-blue-700"
                                            : "hover:bg-gray-50 text-gray-700"
                                        }
                                    `}
                                >
                                    <div
                                        className="
                                            flex
                                            items-center
                                            gap-2
                                            min-w-0
                                        "
                                    >
                                        <input
                                            type="checkbox"
                                            checked={
                                                !!filters?.[
                                                filter
                                                    .accessor
                                                ]
                                            }
                                            onChange={(e) => {
                                                if (!e.target.checked) {
                                                    const updated = {
                                                        ...filters,
                                                    };

                                                    delete updated[
                                                        filter.accessor
                                                    ];

                                                    setFilters(updated);
                                                } else {
                                                    setExpanded(
                                                        (prev) => ({
                                                            ...prev,
                                                            [filter.accessor]:
                                                                true,
                                                        })
                                                    );
                                                }
                                            }}
                                            className="
                                                w-4
                                                h-4
                                                rounded
                                                border-gray-300
                                                text-blue-600
                                                cursor-pointer
                                                shrink-0
                                            "
                                        />

                                        <span className="truncate">
                                            {
                                                filter.label
                                            }
                                        </span>
                                    </div>

                                    {isExpanded ? (
                                        <ChevronDown className="w-4 h-4 shrink-0" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 shrink-0" />
                                    )}
                                </button>

                                {/* CHILDREN */}
                                <motion.div
                                    initial={
                                        false
                                    }
                                    animate={{
                                        maxHeight:
                                            isExpanded
                                                ? 260
                                                : 0,

                                        opacity:
                                            isExpanded
                                                ? 1
                                                : 0,
                                    }}
                                    transition={{
                                        duration: 0.2,
                                    }}
                                    className="
                                        overflow-hidden
                                        border-t
                                        border-gray-100
                                        bg-gray-50/40
                                    "
                                >
                                    <div
                                        className="
                                            max-h-[260px]
                                            overflow-y-auto
                                            overflow-x-hidden
                                            p-2
                                            space-y-1

                                            scrollbar-thin
                                            scrollbar-thumb-gray-200
                                            scrollbar-track-transparent
                                        "
                                    >
                                        {filter.values?.map(
                                            (
                                                item
                                            ) => (
                                                <label
                                                    key={
                                                        item.value
                                                    }
                                                    className="
                                                        flex
                                                        items-center
                                                        gap-3
                                                        px-3
                                                        py-2.5
                                                        rounded-xl
                                                        cursor-pointer
                                                        text-sm
                                                        text-gray-700
                                                        transition-all
                                                        hover:bg-white
                                                        border
                                                        border-transparent
                                                        hover:border-gray-100
                                                        min-w-0
                                                    "
                                                >
                                                    <input
                                                        type="radio"
                                                        name={
                                                            filter.accessor
                                                        }
                                                        checked={
                                                            filters?.[
                                                            filter
                                                                .accessor
                                                            ] ===
                                                            item.value
                                                        }
                                                        onChange={() =>
                                                            handleSelect(
                                                                filter.accessor,
                                                                item.value
                                                            )
                                                        }
                                                        className="
                                                            w-4
                                                            h-4
                                                            text-blue-600
                                                            border-gray-300
                                                            shrink-0
                                                        "
                                                    />

                                                    <span className="truncate">
                                                        {
                                                            item.label
                                                        }
                                                    </span>
                                                </label>
                                            )
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        );
                    }
                )}
            </div>
        </motion.div>
    );
};

export default FilterColumn;