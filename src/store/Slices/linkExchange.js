import { createSlice } from "@reduxjs/toolkit";
import { showConsole } from "../../assets/assets";
import { updateActivity, createLedgerEntry, buildLedgerItem, getCurrentUser } from "../../services/utils";
import { apiRequest } from "../../services/api";

const exchangeSlice = createSlice({
  name: "linkExchange",
  initialState: {
    loading: false,
    emails: [],
    message: null,
    exchanging: false,
    count: 0,
    pageCount: 1,
    pageIndex: 1,
    error: null,
    marked: {}, // threadId: boolean (true if marked, false if unmarked)
  },
  reducers: {
    exchangingRequest(state) {
      state.exchanging = true;
      state.error = null;
      state.message = null;
    },
    exchangingSucess(state, action) {
      state.exchanging = false;
      state.error = null;
      state.message = action.payload;
    },
    exchangingFailed(state, action) {
      state.exchanging = false;
      state.error = action.payload;
      state.message = null;
    },
    setMarkedStatus(state, action) {
      const { id, status } = action.payload;
      state.marked[id] = status;
    },
    clearAllErrors(state) {
      state.error = null;
    },
    clearAllMessages(state) {
      state.message = null;
    },
  },
});



export const linkExchange = ({ email }) => {  // Assuming 'id' is the email/contact identifier for the endpoint
  return async (dispatch, getState) => {
    dispatch(exchangeSlice.actions.exchangingRequest());
    const domain = getState().user.crmEndpoint.split("?")[0];
    try {
      const data = await apiRequest({ endpoint: `${domain}?entryPoint=contactAction`, params: { email, field: 'exchange' } }
      );
      showConsole && console.log(`Exchange Toggle Response`, data);
      if (!data.success) {
        throw new Error("Toggle failed");
      }
      const message = data.new_value === 1 ? "Email link  Successfully" : "Email unlink Successfully";
      dispatch(
        exchangeSlice.actions.exchangingSucess(message)
      );

      dispatch(exchangeSlice.actions.clearAllErrors());
      updateActivity(email, data.new_value === 1 ? "Email link exchange " : "Email unlink ")
      await createLedgerEntry({
        email: email,
        group: "Activity",
        items: [
          buildLedgerItem({
            status: data.new_value === 1 ? "Mark-Link-Exchange" : "Unmark-Link-Exchange",
            detail: `email: {${email}}`,
          }),
        ],
      });

    } catch (error) {
      dispatch(exchangeSlice.actions.exchangingFailed(error.message));
    }
  };
};

export const linkExchangeaction = exchangeSlice.actions;
export default exchangeSlice.reducer;