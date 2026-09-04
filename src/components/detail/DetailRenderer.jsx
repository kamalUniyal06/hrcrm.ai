import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import blockRegistry from "./blocks/blockRegistry";
import { DetailEditProvider } from "@/context/DetailEditContext";
import { orderLayoutBlocks } from "@/utils/layoutRank";

const DetailRenderer = ({ layout, record, entity }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const selectedId = searchParams.get("id");

    /*
     * Normalize record into an array.
     */
    const records = useMemo(() => {
        if (!record) {
            return [];
        }

        return Array.isArray(record)
            ? record
            : [record];
    }, [record]);

    /*
     * Find the selected record using the URL id.
     *
     * If there is no id, use the first record.
     */
    const selectedIndex = useMemo(() => {
        if (!records.length) {
            return -1;
        }

        if (!selectedId) {
            return 0;
        }

        const index = records.findIndex(
            (item) => String(item.id) === String(selectedId)
        );

        return index === -1 ? 0 : index;
    }, [records, selectedId]);

    const selectedRecord = records[selectedIndex];

    /*
     * When multiple records exist and URL doesn't
     * contain an id, put the first record id in URL.
     */
    useEffect(() => {
        if (
            records.length > 1 &&
            selectedId === null &&
            records[0]?.id
        ) {
            const params = new URLSearchParams(searchParams);

            params.set("id", records[0].id);

            setSearchParams(params, {
                replace: true,
            });
        }
    }, [
        records,
        selectedId,
        searchParams,
        setSearchParams,
    ]);

    /*
     * Navigate to another record by changing only
     * the id query parameter.
     */
    const goToRecord = (index) => {
        if (
            index < 0 ||
            index >= records.length ||
            !records[index]?.id
        ) {
            return;
        }

        const params = new URLSearchParams(searchParams);

        params.set("id", records[index].id);

        setSearchParams(params);
    };

    const goToPrevious = () => {
        goToRecord(selectedIndex - 1);
    };

    const goToNext = () => {
        goToRecord(selectedIndex + 1);
    };

    /*
     * Blocks are ordered by `rank`, a binary string comparison.
     * The backend already sends them in order, so this is a
     * no-op for a clean response; it exists because this layout
     * comes out of a react-query cache.
     */
    const blocks = orderLayoutBlocks(layout);

    const Header = blockRegistry["header"];

    if (!selectedRecord) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                No record found.
            </div>
        );
    }

    const hasMultipleRecords = records.length > 1;

    return (
        <DetailEditProvider>
            <div className="space-y-4">
                {/* Record Navigation */}
                {hasMultipleRecords && (
                    <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-2">

                        <button
                            type="button"
                            onClick={goToPrevious}
                            disabled={selectedIndex <= 0}
                            className="rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Previous
                        </button>

                        <div className="text-sm text-gray-600">
                            {selectedIndex + 1} of {records.length}
                        </div>

                        <button
                            type="button"
                            onClick={goToNext}
                            disabled={
                                selectedIndex >= records.length - 1
                            }
                            className="rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                        </button>

                    </div>
                )}
                {/* Header */}
                {layout?.header && (
                    <Header
                        config={layout.header}
                        record={selectedRecord}
                        entity={entity}
                        actionContext={{ navigate }}
                    />
                )}



                {/* Detail Blocks */}
                {blocks.map((block) => {
                    const Component =
                        blockRegistry[block.type];

                    if (!Component) {
                        console.warn(
                            `Unknown detail block type: ${block.type}`
                        );

                        return null;
                    }

                    return (
                        <Component
                            key={block.id}
                            config={block}
                            record={selectedRecord}
                            entity={entity}
                            mode="view"
                        />
                    );
                })}
            </div>
        </DetailEditProvider>
    );
};

export default DetailRenderer;