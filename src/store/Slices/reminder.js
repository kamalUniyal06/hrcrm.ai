import { createSlice } from "@reduxjs/toolkit";
import { showConsole } from "../../assets/assets";
import { apiRequest, fetchGpc } from "../../services/api";
import { CREATE_DEAL_API_KEY } from "../constants";
import { buildLedgerItem, createLedgerEntry, getCurrentUser } from "../../services/utils";

const orderRemSlice = createSlice({
  name: "reminders",
  initialState: {
    loading: false,
    reminders: [],
    dropdownOptions: [],
    count: 0,
    pageCount: 1,
    pageIndex: 1,
    error: null,
    sending: false,
    summary: {},
    sendReminderId: null,
    message: null,
  },
  reducers: {
    sendReminderRequest(state, action) {
      state.sending = true;
      state.sendReminderId = action.payload

    },
    sendReminderSuccess(state, action) {
      state.sending = false;
      state.message = action.payload

    },
    sendReminderFailed(state, action) {
      state.sending = false;
      state.error = action.payload
    },
    clearAllErrors(state) {
      state.error = null;
    },
    clearAllMessage(state) {
      state.message = null;
    },
  },
});

export const sendReminder = (reminderId) => {
  return async (dispatch, getState) => {
    dispatch(orderRemSlice.actions.sendReminderRequest(reminderId));

    try {
      const data = await fetchGpc({ params: { type: "send_reminder", reminder_id: reminderId } });
      showConsole && console.log(`Send Reminders`, data);
      if (data?.success) {
        dispatch(
          orderRemSlice.actions.sendReminderSuccess("Reminder Sent Successfully.")
        );
        dispatch(orderRemSlice.actions.clearAllErrors());
      }
      else {
        throw new Error("Failed To send Reminder")
      }

    } catch (error) {
      dispatch(
        orderRemSlice.actions.sendReminderFailed("Failed To Send Reminder")
      );
    }
  };
};
export const cancelReminder = ({ email, reminderId }) => {
  return async (dispatch, getState) => {
    dispatch(orderRemSlice.actions.sendReminderRequest(reminderId));

    try {
      const data = await apiRequest({
        endpoint: `${getState().user.crmEndpoint.split("?")[0]}?entryPoint=get_post_all`, params: { action_type: "post_data" }, body: {
          parent_bean: {
            "module": "outr_snts",
            "id": reminderId,
            "status": "cancel"
          }
        },
        method: "POST",
        headers: {
          "x-api-key": CREATE_DEAL_API_KEY,
          "Content-Type": "application/json",
        },
      });
      showConsole && console.log(`Send Reminders`, data);
      dispatch(
        orderRemSlice.actions.sendReminderSuccess("Reminder Cancel Successfully.")
      );

      dispatch(orderRemSlice.actions.clearAllErrors());
      await createLedgerEntry({
        domain: getState().user.crmEndpoint.split("?")[0],
        email: email,
        group: "Reminder",
        items: [
          buildLedgerItem({
            status: "Cancel Reminder",
            detail: `Reminder Id ${reminderId}`,
            ladgerState: getState().ladger,
            user: getCurrentUser(),
          }),
        ],
      });


    } catch (error) {
      dispatch(
        orderRemSlice.actions.sendReminderFailed("Failed To Cancel Reminder")
      );
    }
  };
};


export const orderRemAction = orderRemSlice.actions;
export default orderRemSlice.reducer;
