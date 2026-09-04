import {
    ArrowDown,
    ArrowUp,
    X,
} from "lucide-react";

import { useMemo } from "react";
import { useTableContext } from "./Table";

function FilterRow() {
    const {
        filters,
        setFilters,

        sort,
        toggleSort,

        visibleColumns,
    } = useTableContext();

    const removeFilter = (key) => {
        setFilters((prev) => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
    };

    const clearFilters = () => {
        setFilters({});
    };

    const clearSorting = () => {
        toggleSort({
            order_by: "",
            order_dir: "DESC",
        });
    };

    const formatValue = (value) => {
        if (value == null) return "";

        if (typeof value !== "object") return value;

        if (value.neq !== undefined) return `≠ ${value.neq}`;

        if (value.eq !== undefined) return `= ${value.eq}`;

        if (value.gt !== undefined) return `> ${value.gt}`;

        if (value.gte !== undefined) return `≥ ${value.gte}`;

        if (value.lt !== undefined) return `< ${value.lt}`;

        if (value.lte !== undefined) return `≤ ${value.lte}`;

        if (value.in !== undefined) {
            return `in (${Array.isArray(value.in)
                ? value.in.join(", ")
                : value.in
                })`;
        }

        return JSON.stringify(value);
    };

    const filterEntries =
        Object.entries(filters ?? {});

    const sortColumn = useMemo(() => {
        return visibleColumns.find(
            (c) =>
                c.accessor === sort?.order_by
        );
    }, [
        visibleColumns,
        sort?.order_by,
    ]);

    if (
        filterEntries.length === 0 &&
        !sort?.order_by
    ) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2  px-3 py-2">

            <span className="text-sm font-semibold text-gray-600">
                Active:
            </span>

            {/* FILTERS */}

            {filterEntries.map(
                ([key, value]) => (
                    <div
                        key={key}
                        className="
                            flex
                            items-center
                            gap-2
                            rounded-full
                            bg-blue-100
                            px-3
                            py-1
                            text-sm
                            text-blue-700
                        "
                    >
                        <span>

                            {key}: {formatValue(value)}

                        </span>

                        <button
                            onClick={() =>
                                removeFilter(key)
                            }
                            className="hover:text-red-500"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )
            )}

            {/* SORT */}

            {sort?.order_by && (
                <div
                    className="
                        flex
                        items-center
                        gap-2
                        rounded-full
                        bg-green-100
                        px-3
                        py-1
                        text-sm
                        text-green-700
                    "
                >
                    {sort.order_dir ===
                        "ASC" ? (
                        <ArrowUp size={14} />
                    ) : (
                        <ArrowDown size={14} />
                    )}

                    <span>

                        Sort:
                        {" "}
                        {sortColumn?.label ??
                            sort.order_by}

                    </span>

                    <button
                        onClick={clearSorting}
                        className="hover:text-red-500"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
            {(filterEntries.length > 0 ||
                sort?.order_by) && (
                    <button
                        onClick={() => {
                            clearFilters();
                            clearSorting();
                        }}
                        className="
                        text-sm
                        ml-auto
                        font-medium
                        text-red-500
                        hover:underline
                    "
                    >
                        Clear All
                    </button>
                )}

        </div>
    );
}

export default FilterRow;