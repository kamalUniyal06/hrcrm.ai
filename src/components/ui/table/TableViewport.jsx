import { useEffect, useRef } from "react";
import { useTableContext } from "./Table";
import TableHeader from "./TableHeader";
import TableBody from "./TableBody";
import useVirtualRows from "./hooks/useVirtualRows";

export default function TableViewport() {
    const parentRef = useRef(null);

    const {
        data,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
    } = useTableContext();

    const rowVirtualizer = useVirtualRows({
        parentRef,
        count: data.length,
        estimateSize: 48,
        overscan: 10,

        // IMPORTANT:
        // Use the actual record ID instead of
        // the array index as the virtual row key.
        getItemKey: (index) => data[index]?.id,
    });

    /**
     * Infinite loading
     */
    useEffect(() => {
        const items =
            rowVirtualizer.getVirtualItems();

        if (!items.length) {
            return;
        }

        const lastItem =
            items[items.length - 1];

        if (
            lastItem.index >= data.length - 5 &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            fetchNextPage();
        }
    }, [
        rowVirtualizer,
        data.length,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    ]);

    return (
        <div
            ref={parentRef}
            className="flex-1 overflow-auto"
        >
            <TableHeader />

            <TableBody
                rowVirtualizer={rowVirtualizer}
            />
        </div>
    );
}