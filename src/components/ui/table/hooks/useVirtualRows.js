import { useVirtualizer } from "@tanstack/react-virtual";

export default function useVirtualRows({
    parentRef,
    count,
    estimateSize = 48,
    overscan = 10,
    getItemKey,
}) {
    return useVirtualizer({
        count,

        getScrollElement: () =>
            parentRef.current,

        estimateSize: () =>
            estimateSize,

        overscan,

        // IMPORTANT:
        // Keep virtual rows tied to the actual
        // record ID instead of the array index.
        getItemKey,
    });
}