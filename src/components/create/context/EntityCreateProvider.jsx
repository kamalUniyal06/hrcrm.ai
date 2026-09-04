// create/context/EntityCreateProvider.jsx

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import EntityCreateContext
    from "./EntityCreateContext";

import {
    buildCreateState,
} from "../utils/buildCreateState";

import {
    buildCreatePayload,
} from "../utils/buildCreatePayload";

import { useCreateEntity } from "@/hooks/useEntity";

const EntityCreateProvider = ({
    children,
    layout,
    entity,
}) => {
    /*
     * ============================================================
     * INITIAL STATE
     * ============================================================
     */

    const initialState = useMemo(
        () =>
            buildCreateState({
                layout,
            }),
        [layout]
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
     * CREATE MUTATION
     * ============================================================
     */

    const createMutation =
        useCreateEntity();

    /*
     * ============================================================
     * RESET WHEN LAYOUT CHANGES
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
             * -----------------------------------------------
             * UPDATE VALUE
             * -----------------------------------------------
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
             * -----------------------------------------------
             * MARK DIRTY
             * -----------------------------------------------
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
             * -----------------------------------------------
             * CLEAR ERROR
             * -----------------------------------------------
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
     * GET PAYLOAD
     * ============================================================
     */

    const getChanges = useCallback(() => {
        return buildCreatePayload({
            formState,
            dirtyFields,
        });
    }, [
        formState,
        dirtyFields,
    ]);

    /*
     * ============================================================
     * DIRTY CHECK
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
     * CREATE
     * ============================================================
     */

    const create = useCallback(
        async () => {
            if (saving) {
                return;
            }

            const changes =
                buildCreatePayload({
                    formState,
                    dirtyFields,
                });

            if (changes.length === 0) {
                return [];
            }

            try {
                setSaving(true);
                setErrors({});

                /*
                 * ------------------------------------------------
                 * CREATE ALL MODULES
                 * ------------------------------------------------
                 *
                 * IMPORTANT:
                 *
                 * No ID is sent here.
                 *
                 * ------------------------------------------------
                 */

                const results =
                    await Promise.all(
                        changes.map(
                            (change) =>
                                createMutation.mutateAsync(
                                    {
                                        entity:
                                            change.module,

                                        payload:
                                            change.payload,
                                    }
                                )
                        )
                    );

                /*
                 * Create successful.
                 */

                setDirtyFields({});

                setErrors({});

                return results;
            } catch (error) {
                console.error(
                    "Entity creation failed:",
                    error
                );

                /*
                 * Keep form state + dirty state
                 * so user can fix and retry.
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
            createMutation,
        ]
    );

    /*
     * ============================================================
     * CONTEXT
     * ============================================================
     */

    const value = useMemo(
        () => ({
            layout,
            entity,

            formState,
            initialState,

            dirtyFields,
            errors,

            saving,
            isDirty,

            updateField,
            getFieldValue,

            getChanges,
            create,

            resetField,
            resetAll,

            setSaving,
            setErrors,
        }),
        [
            layout,
            entity,

            formState,
            initialState,

            dirtyFields,
            errors,

            saving,
            isDirty,

            updateField,
            getFieldValue,

            getChanges,
            create,

            resetField,
            resetAll,
        ]
    );

    return (
        <EntityCreateContext.Provider
            value={value}
        >
            {children}
        </EntityCreateContext.Provider>
    );
};

export default EntityCreateProvider;