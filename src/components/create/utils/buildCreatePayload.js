// create/utils/buildCreatePayload.js

export const buildCreatePayload = ({
    formState,
    dirtyFields,
}) => {
    const changes = [];

    Object.entries(
        formState ?? {}
    ).forEach(([module, moduleState]) => {
        if (!moduleState) {
            return;
        }

        const dirty =
            dirtyFields?.[module];

        /*
         * If nothing is dirty for this module,
         * don't create it.
         */
        if (
            !dirty ||
            Object.keys(dirty).length === 0
        ) {
            return;
        }

        const payload = {};

        Object.keys(dirty).forEach(
            (accessor) => {
                if (
                    dirty[accessor] !== true
                ) {
                    return;
                }

                payload[accessor] =
                    moduleState.data?.[
                    accessor
                    ];
            }
        );

        if (
            Object.keys(payload).length === 0
        ) {
            return;
        }

        changes.push({
            module,
            payload,
        });
    });

    return changes;
};