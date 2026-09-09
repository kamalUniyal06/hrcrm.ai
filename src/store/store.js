import { configureStore } from "@reduxjs/toolkit";


import userReducer from "./Slices/userSlice.js";

import preferenceReducer from "./Slices/preferencesSlice.js";

export const store = configureStore({
    reducer: {

        user: userReducer,

        preferences: preferenceReducer
    },
});
// store.js

store.subscribe(() => {
    const preferences =
        store.getState().preferences;

    const cleanedTables =
        Object.fromEntries(
            Object.entries(
                preferences.tables
            ).map(
                ([key, table]) => [
                    key,
                    {
                        ...table,
                        initialFiltersApplied:
                            undefined,
                    },
                ]
            )
        );

    localStorage.setItem(
        "preferences",
        JSON.stringify({
            ...preferences,
            tables:
                cleanedTables,
        })
    );
});