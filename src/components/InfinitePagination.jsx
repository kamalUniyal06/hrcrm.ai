import { memo, useRef, useEffect } from "react";
import { List } from "react-window";

function InfinitePagination({ fn, pageCount, pageIndex, data, Row, loading }) {

    const loadingRef = useRef(false);

    const rowHeight = 70;
    const maxHeight = 500; // max table height

    const totalRows = pageIndex < pageCount ? data.length + 1 : data.length;

    const height = Math.min(totalRows * rowHeight, maxHeight);

    useEffect(() => {
        loadingRef.current = false;
    }, [data.length]);

    return (
        <List
            style={{ height, width: "100%" }}
            rowComponent={Row}
            rowCount={totalRows}
            rowHeight={rowHeight}
            rowProps={{ data }}
            overscanCount={5}
            onRowsRendered={({ stopIndex }) => {

                if (
                    stopIndex >= data.length - 1 &&
                    !loading &&
                    pageIndex < pageCount &&
                    !loadingRef.current
                ) {
                    loadingRef.current = true;
                    fn();
                }

            }}
        />
    );
}

export default memo(InfinitePagination);