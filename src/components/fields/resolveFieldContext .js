// utils/resolveFieldValue.js

export const getByPath = (object, path) => {
    if (object == null) {
        return undefined;
    }

    if (!path) {
        return object;
    }

    return String(path)
        .split(".")
        .reduce((current, key) => {
            if (current == null) {
                return undefined;
            }

            return current[key];
        }, object);
};


export const resolveSourceRecord = ({
    record,
    source,
}) => {
    if (!record) {
        return undefined;
    }

    if (!source) {
        return record;
    }

    // source: "contact"
    if (typeof source === "string") {
        return getByPath(record, source);
    }

    // source: {
    //     module: "contacts",
    //     path: "contact"
    // }

    if (!source.path) {
        return record;
    }

    return getByPath(
        record,
        source.path
    );
};


export const resolveFieldValue = ({
    record,
    section,
    field,
}) => {
    if (!record || !field) {
        return undefined;
    }



    const sourceRecord =
        resolveSourceRecord({
            record,
            source: section?.source || field.source,
        });

    if (sourceRecord == null) {
        return undefined;
    }

    return getByPath(
        sourceRecord,
        typeof field === "string" ? field : field.accessor
    );
};


export const resolveFieldContext = ({
    record,
    field,
}) => {
    const sourceRecord =
        resolveSourceRecord({
            record,
            source: field?.source,
        });

    const value = getByPath(
        sourceRecord,
        field?.accessor
    );

    return {
        value,

        record: sourceRecord,

        source: field?.source ?? null,

        module:
            field?.source?.module ?? null,

        accessor:
            field?.accessor ?? null,
    };
};