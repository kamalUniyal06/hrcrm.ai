import { createSlice } from "@reduxjs/toolkit";
import { CREATE_DEAL_API_KEY } from "../constants";
import { showConsole } from "../../assets/assets";
import { apiRequest, fetchGpc } from "../../services/api";

const eventSlice = createSlice({
    name: "events",
    initialState: {
        loading: false,
        adding: false,
        events: [],
        count: 0,
        error: null,
        pageCount: 1,
        pageIndex: 1,
        message: null,
    },
    reducers: {
        getEventsRequest(state) {
            state.loading = true;
            state.error = null;
        },
        getEventsSucess(state, action) {
            const { count, events, pageIndex, pageCount } = action.payload;
            state.loading = false;
            if (pageIndex === 1) {
                state.events = events;
            } else {
                state.events = [...state.events, ...events];
            }
            state.count = count;
            state.pageIndex = pageIndex;
            state.pageCount = pageCount;
            state.error = null;
        },
        getEventsFailed(state, action) {
            state.loading = false;
            state.error = action.payload;
        },
        addEventRequest(state) {
            state.adding = true;
            state.message = null;
            state.error = null;
        },
        addEventSucess(state, action) {
            state.adding = false;
            state.message = action.payload;
            state.error = null;
        },
        addEventFailed(state, action) {
            state.adding = false;
            state.message = null;
            state.error = action.payload;
        },
        clearAllErrors(state) {
            state.error = null;
        },
        clearAllMessages(state) {
            state.message = null;
        },
        UpdateEvents(state, action) {
            state.events = action.payload;
        },
        updateCount(state, action) {
            if (action.payload === 1) {
                state.count += 1;
                return;
            }
            state.count = 0;

        }

    },
});






export const eventActions = eventSlice.actions;
export default eventSlice.reducer;