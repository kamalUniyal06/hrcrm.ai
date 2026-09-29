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

    // Reading the virtual items during render subscribes this component to
    // range changes. Depending on the stable virtualizer instance alone does
    // not rerun the effect when the user scrolls.
    const virtualItems = rowVirtualizer.getVirtualItems();
    const lastVisibleIndex =
        virtualItems[virtualItems.length - 1]?.index;

    /**
     * Infinite loading
     */
    useEffect(() => {
        if (lastVisibleIndex === undefined) {
            return;
        }

        if (
            lastVisibleIndex >= data.length - 5 &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            fetchNextPage();
        }
    }, [
        lastVisibleIndex,
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
