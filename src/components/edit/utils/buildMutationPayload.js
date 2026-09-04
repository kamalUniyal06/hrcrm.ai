export const buildMutationPayload = ({
    formState,
    dirtyFields,
}) => {
    const changes = [];

    Object.entries(
        dirtyFields ?? {}
    ).forEach(
        ([module, fields]) => {
            if (!fields) {
                return;
            }

            const moduleState =
                formState?.[module];

            if (!moduleState) {
                return;
            }

            if (!moduleState.id) {
                console.warn(
                    `No ID found for module: ${module}`
                );

                return;
            }

            const payload = {};

            Object.keys(fields).forEach(
                (accessor) => {
                    /*
                     * Only include fields explicitly
                     * marked dirty.
                     */
                    if (
                        fields[accessor] !== true
                    ) {
                        return;
                    }

                    payload[accessor] =
                        moduleState.data?.[
                        accessor
                        ];
                }
            );

            /*
             * Don't create an empty mutation.
             */
            if (
                Object.keys(payload).length ===
                0
            ) {
                return;
            }

            changes.push({
                module,
                id: moduleState.id,
                payload,
            });
        }
    );

    return changes;
};