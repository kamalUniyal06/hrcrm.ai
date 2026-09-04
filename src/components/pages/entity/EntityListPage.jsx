import { useContext } from "react";

import {
    useTablePreference,
} from "@/hooks/useTablePreference.js";

import {
    useLayout,
} from "@/queries/layouts.queries.js";

import {
    LoadingProgress,
} from "@/components/Loading";

import { PageContext } from "@/context/pageContext";

import TableView from "@/components/ui/table/Table";

import {
    useInfiniteEntity,
} from "@/hooks/useEntity";


const EntityListPage = ({ entity }) => {
    // ------------------------------------------------------------
    // Hooks — ALWAYS run in the same order
    // ------------------------------------------------------------

    const preferences = useTablePreference(entity);

    const {
        enteredEmail: email,
    } = useContext(PageContext);

    const {
        data: layout,
        isPending: layoutPending,
        error: layoutError,
        isError: layoutIsError,
        refetch: layoutRefetch,
    } = useLayout(
        entity,
        "table"
    );

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isPending,
    } = useInfiniteEntity({
        layout,
        preferences,
        email,
        entity,
        dataFilters: layout?.dataFilters ?? {},
        module: layout?.module,
    });

    // ------------------------------------------------------------
    // Loading
    // ------------------------------------------------------------

    if (layoutPending) {
        return (
            <div className="flex h-full min-h-[70vh] items-center justify-center">
                <div className="flex flex-col items-center">
                    <LoadingProgress
                        color="blue"
                        size="100"
                        stroke="5"
                    />
                </div>
            </div>
        );
    }

    // ------------------------------------------------------------
    // Error
    // ------------------------------------------------------------

    if (layoutIsError || layoutError) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center px-6">
                <div className="flex max-w-md flex-col items-center text-center">

                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle
                                cx="12"
                                cy="12"
                                r="10"
                            />
                            <line
                                x1="12"
                                y1="8"
                                x2="12"
                                y2="12"
                            />
                            <line
                                x1="12"
                                y1="16"
                                x2="12.01"
                                y2="16"
                            />
                        </svg>
                    </div>

                    <h2 className="text-lg font-semibold text-gray-900">
                        Unable to load layout
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        We couldn't load the table configuration for{" "}
                        <span className="font-medium text-gray-700">
                            {entity}
                        </span>
                        .
                    </p>

                    {layoutError?.message && (
                        <p className="mt-2 text-xs text-gray-400">
                            {layoutError.message}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={() => layoutRefetch()}
                        className="
                            mt-5
                            rounded-lg
                            border
                            px-4
                            py-2
                            text-sm
                            font-medium
                            text-gray-700
                            transition
                            hover:bg-gray-50
                        "
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    // ------------------------------------------------------------
    // No layout
    // ------------------------------------------------------------

    if (!layout) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Layout not available
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        No table layout has been configured for this entity.
                    </p>
                </div>
            </div>
        );
    }

    // ------------------------------------------------------------
    // Table loading
    // ------------------------------------------------------------

    const loading =
        isPending ||
        isFetchingNextPage;

    // ------------------------------------------------------------
    // Table
    // ------------------------------------------------------------

    return (
        <TableView
            data={data}
            layout={layout}
            entity={entity}
            loading={loading}
            preferences={preferences}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
        />
    );
};

export default EntityListPage;