// create/CreateRenderer.jsx

import React from "react";

import blockRegistry
    from "./blocks";

import { orderLayoutBlocks } from "@/utils/layoutRank";

const CreateRenderer = ({
    layout,
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
                        `Unknown create block type: ${block.type}`
                    );

                    return null;
                }

                return (
                    <Component
                        key={block.id}
                        config={block}
                        entity={entity}
                        mode="create"
                    />
                );
            })}
        </div>
    );
};

export default CreateRenderer;