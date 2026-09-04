import { AnimatePresence, motion } from "framer-motion";
import { useTableContext } from "./Table";
import Icon from "../Icon/Icon";
import { useEntityStats } from "@/hooks/useEntity";
import { useContext } from "react";
import { PageContext } from "@/context/pageContext";

function StatusRow() {
    const {
        layout,
        statusConfig: STATUS_CONFIG,
        entity,
        filters,
        setFilters,
        showStatus,
        preferences
    } = useTableContext();

    const { enteredEmail: email } = useContext(PageContext);

    const {
        data: summary,
        isPending: summaryLoading
    } = useEntityStats({
        filters: preferences,
        email,
        entity,
        stats: STATUS_CONFIG,
        module: layout?.module
    });

    const statusList = STATUS_CONFIG.map((config) => {
        return {
            ...config,
            count: Number(
                summary?.stats?.[`${config.key}`]?.count || 0
            ),
            amount: Number(
                summary?.stats?.[`${config.key}`]?.sum_of?.total_amount_c || 0
            )
        };
    });

    const toggleStatus = (status) => {
        const updated = { ...filters };

        /*
         * Get all filter keys used by the status cards.
         * These will be removed before applying
         * the newly selected status.
         */
        const statusFilterKeys = new Set();

        statusList.forEach((s) => {
            // New structure:
            // filters: {
            //     order_status: "new"
            // }
            if (s.filters) {
                Object.keys(s.filters).forEach((key) => {
                    statusFilterKeys.add(key);
                });
            }

            // Backward compatibility
            if (s.filter) {
                statusFilterKeys.add(s.filter);
            }

            if (s.field) {
                statusFilterKeys.add(s.field);
            }

            if (s.otherFilters) {
                Object.keys(s.otherFilters).forEach((key) => {
                    statusFilterKeys.add(key);
                });
            }

            if (s.neqFilter) {
                Object.keys(s.neqFilter).forEach((key) => {
                    statusFilterKeys.add(key);
                });
            }
        });

        /*
         * Remove all filters controlled by status cards.
         */
        statusFilterKeys.forEach((key) => {
            delete updated[key];
        });

        /*
         * Build the filters for the selected status.
         */
        const statusFilters = {
            ...(status.filters || {})
        };

        /*
         * Backward compatibility with old configuration.
         */
        if (
            !status.filters &&
            (status.filter || status.field)
        ) {
            const key =
                status.filter ||
                status.field;

            statusFilters[key] = status.value;
        }

        /*
         * Additional filters
         */
        if (status.otherFilters) {
            Object.assign(
                statusFilters,
                status.otherFilters
            );
        }

        /*
         * NOT EQUAL filters
         */
        if (status.neqFilter) {
            Object.entries(status.neqFilter).forEach(
                ([field, value]) => {
                    statusFilters[field] = {
                        neq: value
                    };
                }
            );
        }

        /*
         * Check whether the currently selected status
         * is already active.
         */
        const isAlreadyApplied =
            Object.entries(statusFilters).every(
                ([key, value]) => {
                    if (
                        value &&
                        typeof value === "object" &&
                        value.neq !== undefined
                    ) {
                        return (
                            filters?.[key]?.neq ===
                            value.neq
                        );
                    }

                    return filters?.[key] === value;
                }
            );

        /*
         * If already active:
         * remove the status filters.
         */
        if (isAlreadyApplied) {
            setFilters(updated);
            return;
        }

        /*
         * Apply selected status filters.
         */
        Object.assign(
            updated,
            statusFilters
        );

        setFilters(updated);
    };

    const isStatusActive = (status) => {
        if (status.filters) {
            return Object.entries(status.filters).every(
                ([key, value]) =>
                    filters?.[key] === value
            );
        }

        const field =
            status.field;

        return filters?.[field] === status.value;
    };

    return (
        <AnimatePresence initial={false}>
            {showStatus && (
                <motion.div
                    key="status-row"
                    initial={{
                        opacity: 0,
                        height: 0
                    }}
                    animate={{
                        opacity: 1,
                        height: "auto"
                    }}
                    exit={{
                        opacity: 0,
                        height: 0
                    }}
                    transition={{
                        duration: 0.2,
                        ease: "easeOut"
                    }}
                    className="
                        grid
                        grid-cols-2
                        sm:grid-cols-3
                        md:grid-cols-4
                        lg:grid-cols-5
                        xl:grid-cols-6
                        2xl:grid-cols-8
                        gap-2
                        overflow-hidden
                    "
                >
                    {statusList.map((status, i) => {
                        const count =
                            status.count ?? 0;

                        const amount =
                            status.amount ?? 0;

                        const active =
                            isStatusActive(status);

                        const color =
                            status.color ||
                            "#64748b";

                        const countLabel =
                            status.countLabel ||
                            "items";

                        return (
                            <motion.button
                                key={
                                    status.key ||
                                    status.value
                                }
                                type="button"
                                onClick={() => {
                                    if (
                                        status.handleStatusClick
                                    ) {
                                        status.handleStatusClick();
                                    } else {
                                        toggleStatus(
                                            status
                                        );
                                    }
                                }}
                                whileTap={{
                                    scale: 0.98
                                }}
                                transition={{
                                    duration: 0.12
                                }}
                                className={`
                                    group
                                    relative
                                    flex
                                    min-w-0
                                    items-center
                                    gap-3
                                    rounded-xl
                                    border
                                    px-3.5
                                    py-3
                                    text-left
                                    transition-colors
                                    duration-150

                                    ${active
                                        ? "border-primary/40 bg-white"
                                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                    }
                                `}
                            >
                                {/* ICON */}
                                <div
                                    className="
                                        flex
                                        h-9
                                        w-9
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-lg
                                    "
                                    style={{
                                        backgroundColor: `${color}12`,
                                        color: color
                                    }}
                                >
                                    <span className="text-[18px]">
                                        {Icon({
                                            ...status.icon
                                        })}
                                    </span>
                                </div>

                                {/* CONTENT */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        {/* STATUS LABEL */}
                                        <span
                                            className={`
                                                truncate
                                                text-sm
                                                font-semibold
                                                leading-5
                                                ${active
                                                    ? "text-gray-900"
                                                    : "text-gray-600"
                                                }
                                            `}
                                        >
                                            {status.label}
                                        </span>

                                        {/* MAIN VALUE */}
                                        {status.showAmount ? (
                                            <span
                                                className="
                                                    shrink-0
                                                    text-base
                                                    font-bold
                                                    leading-5
                                                    text-gray-900
                                                "
                                            >
                                                $
                                                {Number(
                                                    amount
                                                ).toLocaleString()}
                                            </span>
                                        ) : (
                                            <span
                                                className="
                                                    shrink-0
                                                    text-base
                                                    font-bold
                                                    leading-5
                                                    text-gray-900
                                                "
                                            >
                                                {count.toLocaleString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* SECONDARY VALUE */}
                                    <div className="mt-1 text-sm font-medium text-gray-500">
                                        {status.showAmount
                                            ? `${count.toLocaleString()} ${countLabel}`
                                            : countLabel}
                                    </div>
                                </div>

                                {/* ACTIVE INDICATOR */}
                                {active && (
                                    <span
                                        className="
                                            absolute
                                            bottom-0
                                            left-3
                                            right-3
                                            h-0.5
                                            rounded-full
                                        "
                                        style={{
                                            backgroundColor:
                                                color
                                        }}
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default StatusRow;
