// create/utils/buildCreateState.js

export const buildCreateState = ({
    layout,
}) => {
    const state = {};

    const processSection = (section) => {
        const module =
            section?.source?.module ??
            section?.module;

        if (!module) {
            return;
        }

        if (!state[module]) {
            state[module] = {
                data: {},
            };
        }

        section.fields?.forEach((field) => {
            if (!field?.accessor) {
                return;
            }

            /*
             * -----------------------------------------------
             * DEFAULT VALUE
             * -----------------------------------------------
             */

            let value = field.defaultValue;

            /*
             * Support function defaults later if required.
             *
             * For now:
             *
             * defaultValue: ""
             * defaultValue: null
             * defaultValue: false
             * defaultValue: []
             */

            if (value === undefined) {
                value = null;
            }

            state[module].data[
                field.accessor
            ] = value;
        });
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