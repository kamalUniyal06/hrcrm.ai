import { createSlice } from "@reduxjs/toolkit";
import { showConsole } from "../../assets/assets";
import { updateActivity } from "../../services/utils";
import { fetchGpc } from "../../services/api";


const viewEmailSlice = createSlice({
  name: "viewEmail",
  initialState: {
    loading: false,
    contactLoading: false,
    count: 0,
    viewEmail: [],
    sendedEmail: null,
    sending: false,
    dealInfo: null,
    threadId: null,
    message: null,
    sendFailedResponse: null,
    editMessage: null,
    hashtags: [],
    error: null,
  },
  reducers: {

    sendEmailRequest(state, action) {
      state.sending = true;
      state.message = null;
      state.error = null;
      state.sendFailedResponse = null;
    },
    sendEmailWrong(state, action) {
      const { response } = action.payload;
      state.sending = false;
      state.sendFailedResponse = response;
    },
    sendEmailSucess(state, action) {
      const { message, sendedEmail } = action.payload;
      state.sending = false;
      state.message = message;
      // state.sendedEmail = sendedEmail;
      state.error = null;
    },
    sendEmailFailed(state, action) {
      state.sending = false;
      state.error = action.payload;
    },
    clearAllErrors(state) {
      state.error = null;
    },
    clearAllMessage(state) {
      state.message = null;
      state.sendedEmail = null;
      state.editMessage = null;
    },
    clearFailedResponse(state) {
      state.sendFailedResponse = null;
    },

  },
});




export const sendEmail = (formData) => {
  return async (dispatch, getState) => {
    dispatch(viewEmailSlice.actions.sendEmailRequest());
    try {
      const data = await fetchGpc({ method: "POST", body: formData, headers: { "Content-Type": "multipart/form-data" }, params: { type: "thread_reply" } })
      showConsole && console.log("Reply Data", data);
      if (!data.success && data.response) {
        throw Error("Detect Outbound Message.");
      }
      if (!data.success) {
        throw Error("Error While Sending Email");
      }

      dispatch(
        viewEmailSlice.actions.sendEmailSucess({
          message: `Reply Successfully Sent To ${formData.get("email")}`,
          // sendedEmail: formData.get("email"),
        }),
      );
      dispatch(viewEmailSlice.actions.clearAllErrors());
      localStorage.getItem("addActivity") &&
        updateActivity(
          formData.get("email"),
          "Email Sent",
        );
    } catch (error) {
      showConsole && console.log(error);
      dispatch(
        viewEmailSlice.actions.sendEmailFailed(error.message),
      );
    }
  };
};

export const viewEmailAction = viewEmailSlice.actions;
export default viewEmailSlice.reducer;
