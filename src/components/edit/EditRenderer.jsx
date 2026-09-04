import React from "react";

import blockRegistry from "./blocks/blockRegistry";

import { orderLayoutBlocks } from "@/utils/layoutRank";

const EditRenderer = ({
    layout,
    record,
    entity,
}) => {
    /*
     * Ordered by `rank`, compared as an opaque string.
     */
    const blocks = orderLayoutBlocks(layout);

    const Header =
        blockRegistry.header;

    return (
        <div className="space-y-4">
            {/* =====================================================
                HEADER
            ===================================================== */}

            {layout?.header && Header && (
                <Header
                    config={layout.header}
                    record={record}
                    entity={entity}
                />
            )}

            {/* =====================================================
                BLOCKS
            ===================================================== */}

            {blocks.map((block) => {
                const Component =
                    blockRegistry[
                    block.type
                    ];

                if (!Component) {
                    console.warn(
                        `Unknown block type: ${block.type}`
                    );

                    return null;
                }

                return (
                    <Component
                        key={block.id}
                        config={block}
                        record={record}
                        entity={entity}
                        mode="edit"
                    />
                );
            })}
        </div>
    );
};

export default EditRenderer;