import { createSlice } from "@reduxjs/toolkit";
import { showConsole } from "../../assets/assets";
import { fetchGpc } from "../../services/api";

const aiReplySlice = createSlice({
  name: "aiReply",
  initialState: {
    loading: false,
    aiReply: null,
    error: null,
    message: null,
  },
  reducers: {
    getAiReplyRequest(state) {
      state.loading = true;
      state.error = null;
      state.aiReply = null;
    },
    getAiReplySucess(state, action) {
      const { aiReply, message } = action.payload;
      state.loading = false;
      state.aiReply = aiReply;
      state.error = null;
      state.message = message;
    },
    getAiReplyFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.aiReply = null;
    },
    clearAllErrors(state) {
      state.error = null;
    },
    clearMessge(state) {
      state.message = null;
    },
  },
});

export const getAiReply = (threadId = null, isNew = null, message = null, email = null) => {
  return async (dispatch) => {
    dispatch(aiReplySlice.actions.getAiReplyRequest());

    try {
      if (!threadId) {
        throw new Error("Please provide the thread Id");
      }

      const fetchAiReply = () => fetchGpc({
        params: { type: "ai_reply" }, method: "POST", body: {
          thread_id: threadId,
          new: isNew,
          prompt_body: message
        }
      });

      let data = await fetchAiReply();
      showConsole && console.log(`aiReply`, data);

      if (!data.reply_suggestion) {
        try{
          if (!email) {
            throw new Error("Please provide the thread email");
          }
          const regenerateResponse = await fetchGpc({
            params: { type: "regenerate_summary" }, method: "POST", body: {
              email
            }
          });
          console.log("Regenerate Response:", regenerateResponse);

          if (regenerateResponse === true || regenerateResponse?.success === true) {
            data = await fetchAiReply();
            showConsole && console.log(`aiReply retry`, data);
          }
        } catch (error) {
          console.error("Error occurred while regenerating summary:", error);
        }
      }

      if (!data.reply_suggestion) {
        throw new Error("AI reply suggestion was not generated");
      }

      dispatch(
        aiReplySlice.actions.getAiReplySucess({
          aiReply: data.reply_suggestion,
          message: message ? "User" : isNew ? "New" : "Thread",
        }),
      );
      dispatch(aiReplySlice.actions.clearAllErrors());
    } catch {
      dispatch(
        aiReplySlice.actions.getAiReplyFailed("Fetching AiReply   Failed"),
      );
    }
  };
};

export const aiReplyAction = aiReplySlice.actions;
export default aiReplySlice.reducer;
