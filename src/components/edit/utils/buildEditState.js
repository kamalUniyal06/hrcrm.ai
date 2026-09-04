import { getByPath } from "../../fields/resolveFieldContext ";

export const buildEditState = ({
    layout,
    record,
}) => {
    const state = {};

    const processSection = (section) => {
        const module =
            section?.source?.module ??
            section?.module;

        if (!module) {
            return;
        }

        const sourceRecord =
            section?.source?.path
                ? getByPath(
                    record,
                    section.source.path
                )
                : record;

        if (!sourceRecord) {
            return;
        }

        if (!state[module]) {
            state[module] = {
                id:
                    sourceRecord?.id ??
                    null,

                data: {},
            };
        }

        /*
         * If another section uses the same module,
         * don't recreate the module. Merge its fields.
         */
        if (
            sourceRecord?.id &&
            !state[module].id
        ) {
            state[module].id =
                sourceRecord.id;
        }

        section.fields?.forEach(
            (field) => {
                if (
                    field?.accessor == null
                ) {
                    return;
                }

                const value =
                    getByPath(
                        sourceRecord,
                        field.accessor
                    );

                state[module].data[
                    field.accessor
                ] = value;
            }
        );
    };

    const processBlock = (block) => {
        if (!block) {
            return;
        }

        if (block.type === "section") {
            processSection(block);
            return;
        }

        if (block.type === "tabs") {
            block.tabs?.forEach((tab) => {
                tab.sections?.forEach(
                    processSection
                );
            });
        }
    };

    layout?.blocks?.forEach(
        processBlock
    );

    return state;
};