// preferenceStorage.js

export const getStoredPreferences = () => {
    try {
        return JSON.parse(
            localStorage.getItem("preferences") || "{}"
        );
    } catch {
        return {};
    }
};
// utils/buildTableRequestBody.js

export const buildTableRequestBody = (
    preferences = {},
    defaultFilters = {}
) => {
    const body = {};

    // Date Filters
    if (preferences?.date_filter) {
        body.date_range =
            preferences.date_filter.date_range;

        body.date_field =
            preferences.date_filter.date_field;

        body.date_from =
            preferences.date_filter.date_from;

        body.date_to =
            preferences.date_filter.date_to;
    }

    // Merge default filters + user filters
    const filters = {
        ...defaultFilters,
        ...(preferences?.filters || {}),
    };

    if (Object.keys(filters).length) {
        body.filters = filters;
    }

    // Search
    if (
        preferences?.search_filter?.search?.trim()
    ) {
        body.search =
            preferences.search_filter.search.trim();
    }

    // Search Fields
    if (
        preferences?.search_filter?.search_fields?.length
    ) {
        body.search_fields =
            preferences.search_filter.search_fields;
    }

    // Sorting
    if (
        preferences?.sorting?.order_by
    ) {
        body.order_by =
            preferences.sorting.order_by;

        body.order_dir =
            preferences.sorting.order_dir ||
            "DESC";
    }

    return body;
};
export const INITIAL_TABLE_FILTERS = {
    emails: {
        direction: "inbound",
        conversation_complete: { 'neq': '1' }
    },
    orders: {
        order_status: 'new'
    },

    deals: {
        status: "active",
    },
    tag: {
        is_locked: "0",
    }


};
export const INITIAL_TABLE_SORTING = {
    emails: {
        order_by: "date_modified",
        order_dir: "DESC",
    },
};