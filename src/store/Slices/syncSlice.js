import { createSlice } from "@reduxjs/toolkit";
import { showConsole } from "../../assets/assets";
import { fetchGpc } from "../../services/api";

const syncSlice = createSlice({
    name: "sync",
    initialState: {
        loading: false,
        syncData: null,
        syncType: null,
        error: null,
        count: 0,
        message: null,
    },
    reducers: {
        getSyncRequest(state, action) {
            state.loading = true;
            state.error = null;
            state.syncType = action.payload
            state.count = 0
            state.syncData = null;
        },
        getSyncSucess(state, action) {
            const { syncData, count, message } = action.payload;
            state.loading = false;
            state.syncData = syncData;
            state.error = null;
            state.message = message
            state.count = count
        },
        getSyncFailed(state, action) {
            state.loading = false;
            state.error = action.payload;
            state.syncData = null;
        },
        clearAllErrors(state) {
            state.error = null;
        },
        clearAllMessage(state) {
            state.message = null;
        },
    },
});

export const getSync = (type, max = 3) => {
    return async (dispatch, getState) => {
        dispatch(syncSlice.actions.getSyncRequest(type));
        const email = getState().viewEmail.contactInfo.email1
        try {
            const data = await fetchGpc({ method: "POST", params: { type: "sync_opr", email, fetch_type: type, max } });
            showConsole && console.log(`syncData`, data);
            dispatch(
                syncSlice.actions.getSyncSucess({
                    syncData: data[`${type}`] ?? [],
                    message: data.total_found == 0 ? `${type.toUpperCase()}  Are Up to date` : data?.message,
                    count: data.total_found ?? 0
                }),
            );
            dispatch(syncSlice.actions.clearAllErrors());
        } catch (error) {
            dispatch(
                syncSlice.actions.getSyncFailed("Fetching To Sync Data"),
            );
        }
    };
};

export const syncAction = syncSlice.actions;
export default syncSlice.reducer;
