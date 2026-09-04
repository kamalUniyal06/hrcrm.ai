import { useCallback, useState } from "react";
import blockRegistry from "./blockRegistry";

import { resolveFieldValue } from "../../fields/resolveFieldContext ";


import {
    Tabs as ShadcnTabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";
import useEntityEdit from "../context/useEntityEdit";
import FieldRenderer from "@/components/fields2/FieldRenderer";
import toast from "react-hot-toast";

import {
    orderLayoutFields,
    orderLayoutSections,
    orderLayoutTabs,
} from "@/utils/layoutRank";

const Tabs = ({ config, record, entity, mode }) => {
    /* Scope: the tabs of this tabs block. */
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
}) => {
    const {
        isDirty,
        saving,
        resetAll,
        saveChanges,
    } = useEntityEdit();



    const title =
        resolveFieldValue({
            record,
            field: config.titleField,
        });

    const subtitle =
        resolveFieldValue({
            record,
            field:
                config.subtitleField,
        });

    const description =
        resolveFieldValue({
            record,
            field:
                config.descriptionField,
        });

    const handleSave = async () => {
        if (!isDirty || saving) {
            return;
        }

        try {
            await saveChanges();

            toast.success(
                "Changes saved successfully"
            );
        } catch (error) {
            toast.error(
                "Failed to save changes"
            );
        }
    };

    const handleCancel = () => {
        if (saving) {
            return;
        }

        resetAll();
    };

    return (
        <div className="rounded-xl p-6">
            <div className="flex items-start justify-between gap-6">
                {/* =================================================
                    LEFT
                ================================================= */}

                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold">
                        {title ?? "-"}
                    </h1>

                    {subtitle && (
                        <p className="mt-1 text-sm text-gray-500">
                            {subtitle}
                        </p>
                    )}

                    {description && (
                        <p className="mt-1 text-sm text-gray-400">
                            {description}
                        </p>
                    )}
                </div>

                {/* =================================================
                    RIGHT
                ================================================= */}

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={
                            saving ||
                            !isDirty
                        }
                        className="
                            rounded-lg
                            border
                            px-4
                            py-2
                            text-sm
                            font-medium
                            hover:bg-gray-50
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={
                            saving ||
                            !isDirty
                        }
                        className="
                            rounded-lg
                            bg-black
                            px-4
                            py-2
                            text-sm
                            font-medium
                            text-white
                            hover:bg-gray-800
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        {saving
                            ? "Saving..."
                            : "Save Changes"}
                    </button>
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


const Section = ({
    config,
    record,
}) => {
    const {
        getFieldValue,
        updateField,
        errors,
    } = useEntityEdit();

    const module =
        config?.source?.module ??
        config?.module;

    return (
        <div className="rounded-xl border bg-white p-6">
            {/* =====================================================
                HEADER
            ===================================================== */}

            <div className="mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                    {config.title}
                </h2>
            </div>

            {/* =====================================================
                FIELDS
            ===================================================== */}

            <div
                className="grid gap-5"
                style={{
                    gridTemplateColumns:
                        `repeat(${config.columns ?? 2
                        }, minmax(0, 1fr))`,
                }}
            >
                {/* Scope: the fields of this section. */}
                {orderLayoutFields(config)
                    .map((field) => {
                        const value =
                            getFieldValue({
                                section: config,
                                field,
                            });

                        const fieldError =
                            errors?.[
                            module
                            ]?.[
                            field.accessor
                            ];

                        return (
                            <div
                                key={
                                    field.id ?? field.accessor
                                }
                                className="min-w-0"
                            >
                                {/* =================================
                                    LABEL
                                ================================= */}

                                <label
                                    htmlFor={
                                        field.accessor
                                    }
                                    className="
                                        mb-1.5
                                        block
                                        text-sm
                                        font-medium
                                        text-gray-700
                                    "
                                >
                                    {field.label}

                                    {field.required && (
                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>
                                    )}
                                </label>

                                {/* =================================
                                    FIELD
                                ================================= */}

                                <FieldRenderer
                                    field={field}
                                    value={value}
                                    record={record}
                                    mode="edit"
                                    presentation="edit"
                                    error={
                                        fieldError
                                    }
                                    disabled={
                                        field.readonly ===
                                        true ||
                                        field.editable ===
                                        false
                                    }
                                    onChange={(
                                        nextValue
                                    ) =>
                                        updateField({
                                            section:
                                                config,
                                            field,
                                            value:
                                                nextValue,
                                        })
                                    }
                                />

                                {/* =================================
                                    ERROR
                                ================================= */}

                                {fieldError && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {fieldError}
                                    </p>
                                )}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};







export default {
    Header,
    Summary,
    Section,
    Tabs
};