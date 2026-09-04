import { createSlice } from "@reduxjs/toolkit";
import { extractEmail, showConsole } from "../../assets/assets";
import { fetchGpc } from "../../services/api";

const unrepliedSlice = createSlice({
  name: "unreplied",
  initialState: {
    loading: false,
    emails: [],
    count: 0,
    pageCount: 1,
    pageIndex: 1,
    emailType: "email_inbound",
    error: null,
    unread: 0,
    showNewEmailBanner: false,
    countLoading: false,
    emailsCount: {},
    countError: null,
    totalCount: 0
  },
  reducers: {
    getEmailRequest(state, action) {
      state.emailType = action.payload.type ?? state.emailType;
      state.loading = action.payload.loading;
      state.error = null;
    },
    getEmailSucess(state, action) {
      const { count, emails, pageCount, pageIndex } = action.payload;
      state.loading = false;
      if (pageIndex === 1) {
        state.emails = emails;
      } else {
        state.emails = [...state.emails, ...emails];
      }
      state.count = count;
      state.pageCount = pageCount;
      state.pageIndex = pageIndex;
      state.error = null;
    },
    getEmailFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.count = 0;
      state.emails = [];
      state.pageCount = 0;
      state.pageIndex = 0
    },
    getEmailsCountRequest(state, action) {
      state.countLoading = action.payload.loading;
      state.countError = null;
    },
    getEmailsCountSucess(state, action) {
      state.countLoading = false;
      state.emailsCount = action.payload.emailsCount;
      state.totalCount = action.payload.totalCount
      state.countError = null;
    },
    getEmailsCountFailed(state, action) {
      state.countLoading = false;
      state.countError = action.payload;
    },
    clearAllErrors(state) {
      state.error = null;
    },
    removeUnreplied(state, action) {
      state.emails = state.emails.filter(e => extractEmail(e?.from) !== action.payload);
      state.emailsCount[state.emailType]--;
    },
    setShowNewEmailBanner(state, action) {
      state.showNewEmailBanner = action.payload;
    },
    updateUnread(state, action) {
      state.unread = state.unread - 1;
      state.emails = state.emails.map((email) => {
        if (email.thread_id === action.payload.thread_id) {
          email.is_seen = 1;
        }
        return email;
      });
    }
  },
});

export const getEmailsCount = ({ loading = true }) => {
  return async (dispatch, getState) => {
    dispatch(unrepliedSlice.actions.getEmailsCountRequest({ loading }));
    try {
      const timeline = getState().ladger.timeline;
      const data = await fetchGpc({ params: { type: "email_stats", ...(timeline && timeline !== "null" ? { filter: timeline } : {}) } });
      showConsole && console.log(`EMAILS COUNT`, data);
      dispatch(
        unrepliedSlice.actions.getEmailsCountSucess({ emailsCount: data?.data, totalCount: data?.total_contacts })
      );
      dispatch(unrepliedSlice.actions.clearAllErrors());
    } catch (error) {
      dispatch(
        unrepliedSlice.actions.getEmailsCountFailed(
          "Fetching  Emails Count Failed"
        )
      );
    }
  };
};


export const unrepliedAction = unrepliedSlice.actions;
export default unrepliedSlice.reducer;
