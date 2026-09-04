import { createSlice, current } from "@reduxjs/toolkit";
import { showConsole } from "../../assets/assets";
import { updateActivity, createLedgerEntry, buildLedgerItem, getCurrentUser } from "../../services/utils";
import { fetchGpc } from "../../services/api";

const forwardedSlice = createSlice({
  name: "forwarded",
  initialState: {
    loading: false,
    forward: false,
    emails: [],
    count: 0,
    error: null,
    message: null,
    pageIndex: 1,
    pageCount: 1
  },
  reducers: {
    getEmailRequest(state) {
      state.loading = true;
      state.error = null;
    },
    getEmailSucess(state, action) {
      const { count, emails } = action.payload;
      state.loading = false;
      state.emails = emails;
      state.count = count;
      state.error = null;
    },
    getEmailFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    forwardEmailRequest(state) {
      state.forward = true;
      state.error = null;
      state.message = null;
    },
    forwardEmailSucess(state, action) {
      state.forward = false;
      state.error = null;
      state.message = action.payload;
    },
    forwardEmailFailed(state, action) {
      state.forward = false;
      state.error = action.payload;
      state.message = null;
    },
    clearAllErrors(state) {
      state.error = null;
    },
    clearAllMessages(state) {
      state.message = null;
    },
  },
});



export const forwardEmail = (email, id) => {
  return async (dispatch, getState) => {
    dispatch(forwardedSlice.actions.forwardEmailRequest());
    showConsole && console.log("CLIENT EMAIL", email)
    showConsole && console.log("CLIENT ID", id)

    try {
      const data = await fetchGpc({
        params: { type: 'assigned_task' }, body: {
          "client_email": email,
          "current_email": getState().user.user.email,
          "assigned_to": id,
        },
        method: "POST"
      }
      );
      showConsole && console.log("Assiging  ", data);
      dispatch(forwardedSlice.actions.forwardEmailSucess("Email Forwarded Successfully"));
      dispatch(forwardedSlice.actions.clearAllErrors());
      updateActivity(email, "Email Assign")

      await createLedgerEntry({
        email: email,
        group: "Activity",
        items: [
          buildLedgerItem({
            status: "Forward-To",
            detail: `email: {${email}} name: {${email}}`,
          }),
        ],
      });

    } catch (error) {
      dispatch(forwardedSlice.actions.forwardEmailFailed(error.message));
    }
  };
};

export const forwardedAction = forwardedSlice.actions;
export default forwardedSlice.reducer;