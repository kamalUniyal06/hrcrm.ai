import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import EntityEditContext from "./EntityEditContext";

import {
    buildEditState,
} from "../utils/buildEditState";

import {
    buildMutationPayload,
} from "../utils/buildMutationPayload";

import { useUpdateEntity } from "@/hooks/useEntity";

const EntityEditProvider = ({
    children,
    layout,
    record,
    entity,
    email,
}) => {
    /*
     * ============================================================
     * INITIAL STATE
     * ============================================================
     */

    const initialState = useMemo(
        () =>
            buildEditState({
                layout,
                record,
            }),
        [layout, record]
    );

    /*
     * ============================================================
     * FORM STATE
     * ============================================================
     */

    const [
        formState,
        setFormState,
    ] = useState(initialState);
    /*
     * ============================================================
     * DIRTY FIELDS
     *
     * {
     *     contacts: {
     *         first_name: true,
     *         phone: true
     *     },
     *
     *     accounts: {
     *         name: true
     *     }
     * }
     * ============================================================
     */

    const [
        dirtyFields,
        setDirtyFields,
    ] = useState({});

    /*
     * ============================================================
     * ERRORS
     * ============================================================
     */

    const [
        errors,
        setErrors,
    ] = useState({});

    /*
     * ============================================================
     * SAVING
     * ============================================================
     */

    const [
        saving,
        setSaving,
    ] = useState(false);

    /*
     * ============================================================
     * UPDATE MUTATION
     * ============================================================
     */

    const updateMutation =
        useUpdateEntity();

    /*
     * ============================================================
     * SYNC INITIAL STATE
     * ============================================================
     *
     * If the record changes because of a refetch/navigation,
     * rebuild the form.
     *
     * ============================================================
     */

    useEffect(() => {
        setFormState(initialState);
        setDirtyFields({});
        setErrors({});
    }, [initialState]);

    /*
     * ============================================================
     * UPDATE FIELD
     * ============================================================
     */

    const updateField = useCallback(
        ({
            section,
            field,
            value,
        }) => {
            const module =
                section?.source?.module ??
                section?.module;

            if (!module) {
                console.warn(
                    "No module found for section",
                    section
                );

                return;
            }

            /*
             * ----------------------------------------------------
             * UPDATE FORM VALUE
             * ----------------------------------------------------
             */

            setFormState(
                (previous) => ({
                    ...previous,

                    [module]: {
                        ...previous[module],

                        data: {
                            ...previous[module]
                                ?.data,

                            [field.accessor]:
                                value,
                        },
                    },
                })
            );

            /*
             * ----------------------------------------------------
             * MARK FIELD DIRTY
             * ----------------------------------------------------
             */

            setDirtyFields(
                (previous) => ({
                    ...previous,

                    [module]: {
                        ...previous[module],

                        [field.accessor]:
                            true,
                    },
                })
            );

            /*
             * ----------------------------------------------------
             * CLEAR FIELD ERROR
             * ----------------------------------------------------
             */

            setErrors(
                (previous) => {
                    if (
                        !previous[module]
                    ) {
                        return previous;
                    }

                    const moduleErrors = {
                        ...previous[module],
                    };

                    delete moduleErrors[
                        field.accessor
                    ];

                    const next = {
                        ...previous,
                    };

                    if (
                        Object.keys(
                            moduleErrors
                        ).length > 0
                    ) {
                        next[module] =
                            moduleErrors;
                    } else {
                        delete next[module];
                    }

                    return next;
                }
            );
        },
        []
    );

    /*
     * ============================================================
     * GET FIELD VALUE
     * ============================================================
     */

    const getFieldValue = useCallback(
        ({
            section,
            field,
        }) => {
            const module =
                section?.source?.module ??
                section?.module;

            if (!module) {
                return undefined;
            }

            return formState?.[
                module
            ]?.data?.[
                field.accessor
            ];
        },
        [formState]
    );

    /*
     * ============================================================
     * GET CHANGES
     * ============================================================
     */

    const getChanges = useCallback(() => {
        return buildMutationPayload({
            formState,
            dirtyFields,
        });
    }, [
        formState,
        dirtyFields,
    ]);

    /*
     * ============================================================
     * IS DIRTY
     * ============================================================
     */

    const isDirty = useMemo(() => {
        return Object.values(
            dirtyFields
        ).some(
            (module) =>
                Object.keys(
                    module ?? {}
                ).length > 0
        );
    }, [dirtyFields]);

    /*
     * ============================================================
     * RESET FIELD
     * ============================================================
     */

    const resetField = useCallback(
        ({
            section,
            field,
        }) => {
            const module =
                section?.source?.module ??
                section?.module;

            if (!module) {
                return;
            }

            const originalValue =
                initialState?.[
                    module
                ]?.data?.[
                field.accessor
                ];

            /*
             * Restore original value.
             */
            setFormState(
                (previous) => ({
                    ...previous,

                    [module]: {
                        ...previous[module],

                        data: {
                            ...previous[module]
                                ?.data,

                            [field.accessor]:
                                originalValue,
                        },
                    },
                })
            );

            /*
             * Remove dirty flag.
             */
            setDirtyFields(
                (previous) => {
                    const moduleDirty = {
                        ...previous[
                        module
                        ],
                    };

                    delete moduleDirty[
                        field.accessor
                    ];

                    const next = {
                        ...previous,
                    };

                    if (
                        Object.keys(
                            moduleDirty
                        ).length > 0
                    ) {
                        next[module] =
                            moduleDirty;
                    } else {
                        delete next[module];
                    }

                    return next;
                }
            );

            /*
             * Remove error.
             */
            setErrors(
                (previous) => {
                    const moduleErrors = {
                        ...previous[
                        module
                        ],
                    };

                    delete moduleErrors[
                        field.accessor
                    ];

                    const next = {
                        ...previous,
                    };

                    if (
                        Object.keys(
                            moduleErrors
                        ).length > 0
                    ) {
                        next[module] =
                            moduleErrors;
                    } else {
                        delete next[module];
                    }

                    return next;
                }
            );
        },
        [initialState]
    );

    /*
     * ============================================================
     * RESET ALL
     * ============================================================
     */

    const resetAll = useCallback(() => {
        setFormState(initialState);
        setDirtyFields({});
        setErrors({});
    }, [initialState]);

    /*
     * ============================================================
     * SAVE CHANGES
     * ============================================================
     */

    const saveChanges = useCallback(
        async () => {
            if (saving) {
                return;
            }

            const changes =
                buildMutationPayload({
                    formState,
                    dirtyFields,
                });
            console.log("changes", changes)

            if (changes.length === 0) {
                return;
            }

            try {
                setSaving(true);

                setErrors({});


                await Promise.all(
                    changes.map(
                        (change) =>
                            updateMutation.mutateAsync(
                                {
                                    entity:
                                        change.module,

                                    id:
                                        change.id,

                                    payload:
                                        change.payload,
                                }
                            )
                    )
                );

                /*
                 * =================================================
                 * SUCCESS
                 * =================================================
                 *
                 * The current form state becomes the new
                 * baseline.
                 *
                 * =================================================
                 */

                setDirtyFields({});

                setErrors({});

                /*
                 * Make current state the new initial state
                 * for future resetField operations.
                 *
                 * We cannot mutate initialState directly because
                 * it is memoized.
                 *
                 * The server/query should normally refetch and
                 * provide the updated record.
                 */

                return changes;
            } catch (error) {
                console.error(
                    "Entity update failed:",
                    error
                );

                /*
                 * Keep dirty fields intact so the user can
                 * retry.
                 */

                throw error;
            } finally {
                setSaving(false);
            }
        },
        [
            saving,
            formState,
            dirtyFields,
            updateMutation,
        ]
    );

    /*
     * ============================================================
     * CONTEXT VALUE
     * ============================================================
     */

    const value = useMemo(
        () => ({
            layout,
            record,
            entity,
            email,

            formState,
            initialState,

            dirtyFields,
            errors,

            saving,
            isDirty,

            updateField,
            getFieldValue,

            getChanges,
            saveChanges,

            resetField,
            resetAll,

            setSaving,
            setErrors,
        }),
        [
            layout,
            record,
            entity,
            email,

            formState,
            initialState,

            dirtyFields,
            errors,

            saving,
            isDirty,

            updateField,
            getFieldValue,

            getChanges,
            saveChanges,

            resetField,
            resetAll,
        ]
    );

    return (
        <EntityEditContext.Provider
            value={value}
        >
            {children}
        </EntityEditContext.Provider>
    );
};

export default EntityEditProvider;