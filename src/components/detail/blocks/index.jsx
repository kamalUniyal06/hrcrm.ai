import { useCallback, useState } from "react";
import blockRegistry from "./blockRegistry";
import { resolveFieldValue } from "../../fields/resolveFieldContext ";
import ActionField from "../../fields/actions/ActionField";

import {
    Tabs as ShadcnTabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";
import { useUpdateEntity } from "@/queries/entity.queries";
import toast from "react-hot-toast";
import DetailField from "../DetailField";
import { queryClient } from "@/lib/queryClient";

import {
    orderLayoutActions,
    orderLayoutFields,
    orderLayoutSections,
    orderLayoutTabs,
} from "@/utils/layoutRank";
import { useQueryClient } from "@tanstack/react-query";

const Tabs = ({ config, record, entity, mode }) => {
    /*
     * Scope: the tabs of THIS tabs block. Ranks are unique
     * inside the immediate parent collection only, so tabs from
     * two different blocks are never compared.
     */
    const tabs = orderLayoutTabs(config);

    const defaultTab =
        config.defaultTab || tabs[0]?.id;

    return (
        <ShadcnTabs
            defaultValue={defaultTab}
            className="w-full"
        >
            {/* Tab Buttons */}
            <TabsList className="h-auto rounded-full border bg-white p-1 ">
                {tabs.map((tab) => (
                    <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="
                rounded-full
                px-5
                py-2
                text-sm
                font-medium
                text-gray-700
                transition-all

                data-[state=active]:bg-blue-50
                data-[state=active]:text-gray-900
                data-[state=active]:ring-1
                data-[state=active]:ring-blue-400
                data-[state=active]:shadow-none
            "
                    >
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>

            {/* Tab Content */}
            {tabs.map((tab) => (
                <TabsContent
                    key={tab.id}
                    value={tab.id}
                    className="space-y-4"
                >
                    {/* Scope: the sections of this tab. */}
                    {orderLayoutSections(tab).map((section) => {
                        const Component =
                            blockRegistry[section.type];

                        if (!Component) {
                            return null;
                        }

                        return (
                            <Component
                                key={section.id}
                                config={section}
                                record={record}
                                entity={entity}
                                mode={mode}
                            />
                        );
                    })}
                </TabsContent>
            ))}
        </ShadcnTabs>
    );
};



const Header = ({
    config,
    record,
    entity,
    actionContext = {},
}) => {
    const title =
        resolveFieldValue({
            record,
            field: config?.titleField,
        });

    const subtitle =
        resolveFieldValue({
            record,
            field: config?.subtitleField,
        });

    const description =
        resolveFieldValue({
            record,
            field: config?.descriptionField,
        });

    return (
        <div className="rounded-xl border bg-white p-6">
            <div className="flex items-start justify-between gap-6">

                {/* =====================================================
                    LEFT
                ===================================================== */}

                <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold">
                        {title ?? "-"}
                    </h1>

                    {subtitle != null && (
                        <p className="mt-1 text-sm text-gray-500">
                            {subtitle}
                        </p>
                    )}

                    {description != null && (
                        <p className="mt-1 text-sm text-gray-400">
                            {description}
                        </p>
                    )}
                </div>


                {/* =====================================================
                    RIGHT - ACTIONS
                ===================================================== */}

                <div className="flex shrink-0 items-center gap-2">
                    {config?.actions?.length > 0 && (
                        <ActionField
                            field={{
                                /* Scope: the actions of this header. */
                                actions:
                                    orderLayoutActions(config),
                            }}
                            record={record}
                            actionContext={{
                                entity,
                                ...actionContext,
                            }}
                        />
                    )}
                </div>

            </div>
        </div>
    );
};


const Summary = ({ config, record }) => {

    return (

        <div className="grid grid-cols-2 gap-5">

            {config.fields.map(field => (

                <div key={field}>

                    <label>{field}</label>

                    <div>{record[field]}</div>

                </div>

            ))}

        </div>

    );

};



// Keep your existing imports for:
// DetailField
// resolveFieldValue
// orderLayoutFields

const Section = ({
    config,
    record,
    mode,
    entity,
}) => {
    console.log("CONFIG", config);
    console.log("RECORD", record);

    const gridCols = {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
        5: "grid-cols-5",
        6: "grid-cols-6",
    };

    /*
     * ---------------------------------------------------------
     * QUERY CLIENT
     * ---------------------------------------------------------
     */

    const queryClient = useQueryClient();

    /*
     * ---------------------------------------------------------
     * UPDATE ENTITY
     * ---------------------------------------------------------
     */

    const updateMutation = useUpdateEntity();

    const handleSave = useCallback(
        async ({
            value,
            previousValue,
            field,
        }) => {
            const rowId =
                resolveFieldValue({
                    record,
                    section: config,
                    field: "id",
                });

            if (!rowId) {
                toast.error(
                    "Record ID not found"
                );

                throw new Error(
                    "Record ID not found"
                );
            }

            /*
             * -----------------------------------------------------
             * NEW VALUE
             * -----------------------------------------------------
             */
            const newValue = value;

            /*
             * Nothing actually changed.
             */
            if (
                Object.is(
                    previousValue,
                    newValue
                )
            ) {
                return;
            }

            /*
             * -----------------------------------------------------
             * SAVE TOAST
             * -----------------------------------------------------
             */

            const toastId =
                toast.loading(
                    "Saving changes..."
                );

            try {
                /*
                 * -------------------------------------------------
                 * FIRST REQUEST
                 * Save NEW value.
                 * -------------------------------------------------
                 */

                await updateMutation.mutateAsync({
                    module: config.module,
                    entity: config.module,
                    id: rowId,
                    payload: {
                        [field.accessor]:
                            newValue,
                    },
                });

                /*
                 * Refresh entity data.
                 */
                await queryClient.invalidateQueries({
                    queryKey: [
                        "entity",
                        entity,
                    ],
                });

                /*
                 * -------------------------------------------------
                 * SUCCESS + UNDO
                 * -------------------------------------------------
                 *
                 * previousValue is already captured by this
                 * callback and represents the value BEFORE save.
                 */

                toast.success(
                    (t) => {
                        let undoClicked = false;

                        const handleUndo =
                            async () => {
                                if (undoClicked) {
                                    return;
                                }

                                undoClicked = true;

                                toast.loading(
                                    "Undoing changes...",
                                    {
                                        id: t.id,
                                    }
                                );

                                try {
                                    /*
                                     * ---------------------------------
                                     * SECOND REQUEST
                                     * Restore OLD value.
                                     * ---------------------------------
                                     */

                                    await updateMutation.mutateAsync({
                                        module:
                                            config.module,
                                        entity:
                                            config.module,
                                        id: rowId,
                                        payload: {
                                            [field.accessor]:
                                                previousValue,
                                        },
                                    });

                                    /*
                                     * Refresh entity.
                                     */
                                    await queryClient.invalidateQueries({
                                        queryKey: [
                                            "entity",
                                            entity,
                                        ],
                                    });

                                    toast.success(
                                        "Changes undone",
                                        {
                                            id: t.id,
                                            duration: 3000,
                                        }
                                    );
                                } catch (error) {
                                    console.error(
                                        "Undo failed:",
                                        error
                                    );

                                    toast.error(
                                        "Failed to undo changes",
                                        {
                                            id: t.id,
                                            duration: 4000,
                                        }
                                    );
                                }
                            };

                        return (
                            <div className="flex items-center gap-3">
                                <span>
                                    Changes saved
                                </span>

                                <button
                                    type="button"
                                    onClick={
                                        handleUndo
                                    }
                                    disabled={
                                        undoClicked
                                    }
                                    className="
                                    font-medium
                                    text-blue-600
                                    hover:text-blue-700
                                    underline
                                    disabled:opacity-50
                                    disabled:cursor-not-allowed
                                "
                                >
                                    Undo
                                </button>
                            </div>
                        );
                    },
                    {
                        id: toastId,
                        duration: 5000,
                    }
                );
            } catch (error) {
                console.error(
                    "Field update failed:",
                    error
                );

                toast.error(
                    "Failed to update field",
                    {
                        id: toastId,
                    }
                );

                /*
                 * VERY IMPORTANT:
                 *
                 * Throw the error back to DetailField.
                 *
                 * DetailField uses this to rollback its
                 * optimistic display value.
                 */
                throw error;
            }
        },
        [
            config,
            entity,
            record,
            updateMutation,
            queryClient,
        ]
    );

    /*
     * ---------------------------------------------------------
     * VIEW MODE
     * ---------------------------------------------------------
     */

    return (
        <div className="mt-6 rounded-xl border bg-white p-6">

            <h2 className="text-2xl font-semibold">
                {config.title}
            </h2>

            <div
                className={`
                    mt-4
                    grid
                    ${gridCols[config.columns] || "grid-cols-3"}
                    gap-4
                `}
            >
                {orderLayoutFields(
                    config
                ).map(
                    (field) => {
                        const value =
                            resolveFieldValue({
                                record,
                                section:
                                    config,
                                field,
                            });

                        return (
                            <DetailField
                                key={
                                    field.id ??
                                    field.accessor
                                }
                                value={value}
                                updating={
                                    updateMutation.isPending
                                }
                                field={field}
                                fieldKey={
                                    field.accessor
                                }
                                record={record}
                                onSave={
                                    handleSave
                                }
                            />
                        );
                    }
                )}
            </div>
        </div>
    );
};




const Timeline = () => {

    return <div>Timeline</div>;

};

const RelatedRecord = ({ config, record }) => {

    return (

        <div>

            Related Record

            {record?.[config.relationshipField]?.name}

        </div>

    );

};

const RelatedList = ({ config }) => {

    return (

        <div>

            Related List

            {config.module}

        </div>

    );

};

const Widget = ({ config }) => {

    return <div>{config.widget}</div>;

};

export default {
    Header,
    Summary,
    Section,
    Timeline,
    RelatedRecord,
    RelatedList,
    Widget,
    Tabs
};