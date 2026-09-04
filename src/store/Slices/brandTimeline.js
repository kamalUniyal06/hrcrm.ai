import { createSlice } from "@reduxjs/toolkit";
import { fetchGpc } from "../../services/api";
const brandTimelineSlice = createSlice({
    name: "brandTimeline",
    initialState: {
        loading: false,
        account: {},
        contacts: [],
        error: null,
        message: null,
        showBrandTimeline: false,
    },
    reducers: {
        getBTRequest(state) {
            state.loading = true;
            state.showBrandTimeline = true;
            state.contacts = [];
            state.account = {};
            state.error = null;
            state.email = null;
        },

        getBTSuccess(state, action) {
            const { contacts, account } = action.payload;
            state.loading = false;
            state.contacts = contacts;
            state.account = account;
            state.error = null;
        },

        getBTFailed(state) {
            state.loading = false;
            state.showBrandTimeline = false;
            state.error = "Failed To Get Brand Timeline";
        },
        clearAllErrors(state) {
            state.error = null;
        },
        setShowBrandTimeline(state, action) {
            state.showBrandTimeline = action.payload
        }
    },
});

export const getBrandTimeline = ({ email = null, loading = true, }) => {
    return async (dispatch, getState) => {
        if (loading) {
            dispatch(brandTimelineSlice.actions.getBTRequest());
        }
        try {
            const { data } = await fetchGpc({ params: { type: 'brandTimeline', email } });
            console.log("BRAND TIMELINE", data)
            const freshData = {
                account: data.account,
                contacts: data.contacts,
            };

            dispatch(brandTimelineSlice.actions.getBTSuccess(freshData));
            dispatch(brandTimelineSlice.actions.clearAllErrors());
        } catch (error) {
            console.log(error)
            dispatch(
                brandTimelineSlice.actions.getBTFailed(
                    error.response?.data?.message
                )
            );
        }
    };
};
export const brandTimelineAction = brandTimelineSlice.actions;
export default brandTimelineSlice.reducer;
