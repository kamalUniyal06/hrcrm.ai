import { createSlice } from "@reduxjs/toolkit";
import { AUTH_URL } from "../constants";
import { showConsole } from "../../assets/assets";
import { apiRequest } from "../../services/api";
import { clearCrmToken } from "../../services/crmAuth";

const initialState = {
  loading: false,

  // Logged-in user information
  user: {},

  // HRCRM user information
  userInfo: {
    id: null,
    stage: null,
    phase: null,
    status: null,
  },

  isAuthenticated: false,
  error: null,
  message: null,
};

const userSlice = createSlice({
  name: "user",

  initialState,

  reducers: {
    loadUserRequest(state) {
      state.loading = true;
      state.isAuthenticated = false;

      state.user = {};

      state.userInfo = {
        id: null,
        stage: null,
        phase: null,
        status: null,
      };

      state.error = null;
      state.message = null;
    },

    loadUserSuccess(state, action) {
      const { user, userInfo } = action.payload;

      state.loading = false;
      state.isAuthenticated = true;

      state.user = user || {};

      state.userInfo = {
        id: userInfo?.id ?? null,
        stage: userInfo?.stage ?? null,
        phase: userInfo?.phase ?? null,
        status: userInfo?.status ?? null,
      };

      state.error = null;
      state.message = null;
    },

    loadUserFailed(state, action) {
      state.loading = false;
      state.isAuthenticated = false;

      state.user = {};

      state.userInfo = {
        id: null,
        stage: null,
        phase: null,
        status: null,
      };

      state.error = action.payload;
    },

    logoutRequest(state) {
      state.loading = true;
    },

    logoutSuccess(state, action) {
      state.loading = false;
      state.isAuthenticated = false;

      state.user = {};

      state.userInfo = {
        id: null,
        stage: null,
        phase: null,
        status: null,
      };

      state.error = null;
      state.message = action.payload;
    },

    logoutFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    clearAllErrors(state) {
      state.error = null;
    },
  },
});

// ============================================================
// GET CURRENT USER
// ============================================================

export const getUser = () => {
  return async (dispatch) => {
    dispatch(userSlice.actions.loadUserRequest());

    try {
      const data = await apiRequest({
        endpoint: `${AUTH_URL}?controller=auth`,
        params: {
          action: "me",
        },
        withCredentials: true,
      });

      showConsole && console.log("user", data);

      /*
        Backend response:

        {
          "user": {
            "email": "user@example.com"
          },
          "userInfo": {
            "id": "...",
            "stage": "Joining",
            "phase": "Employment",
            "status": "Joining Confirmed"
          }
        }

        OR if your backend returns:
        
        {
          "user": {
            "email": "user@example.com"
          },
          "id": "...",
          "stage": "Joining",
          "phase": "Employment",
          "status": "Joining Confirmed"
        }
      */

      const userInfo = data.userInfo || {
        id: data.id ?? null,
        stage: data.stage ?? null,
        phase: data.phase ?? null,
        status: data.status ?? null,
      };

      dispatch(
        userSlice.actions.loadUserSuccess({
          user: data.user || {},

          userInfo,
        }),
      );

      dispatch(userSlice.actions.clearAllErrors());
    } catch (error) {
      console.log("Full Error:", error.response);

      localStorage.setItem("displayIntro", "true");

      let message = "Something went wrong. Please try again.";

      if (error.response) {
        const status = error.response?.status;

        const backendError = error.response?.data?.error || "";

        switch (status) {
          case 404:
            message = null;
            break;

          case 401:
            if (backendError.includes("Invalid token")) {
              message = "Your session expired. Please login again.";
            } else if (backendError.includes("Unauthorized user")) {
              message = "You don’t have permission to access this area.";
            } else if (
              backendError.includes("email missing") ||
              backendError.includes("Token and email both missing")
            ) {
              message = "Please login again.";
            } else {
              message = "Authentication failed.";
            }

            break;

          case 400:
            if (backendError.includes("Token and email both missing")) {
              message = "";
            } else {
              message = backendError || "Invalid request.";
            }

            break;

          case 500:
            message = "Server error. Please try again later.";
            break;

          case 503:
            message = "Unable to verify your account. Please try again later.";
            break;

          default:
            message = backendError || "Something went wrong on our side.";
        }
      } else if (error.request) {
        message = "Network error. Please check your internet connection.";
      }

      dispatch(userSlice.actions.loadUserFailed(message));
    }
  };
};

// ============================================================
// LOGOUT
// ============================================================

export const logout = () => {
  return async (dispatch) => {
    dispatch(userSlice.actions.logoutRequest());

    try {
      const data = await apiRequest({
        endpoint: `${AUTH_URL}?controller=auth`,
        params: {
          action: "logout",
        },
        withCredentials: true,
      });

      // Clear the in-memory CRM access token so no stale token is
      // reused after the next login.
      clearCrmToken();

      // Clear all localStorage
      localStorage.clear();

      // Show intro again after logout
      localStorage.setItem("displayIntro", "true");

      dispatch(userSlice.actions.logoutSuccess(data?.message));

      dispatch(userSlice.actions.clearAllErrors());
    } catch (error) {
      dispatch(
        userSlice.actions.logoutFailed(
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Logout Failed",
        ),
      );
    }
  };
};

// ============================================================
// CLEAR USER ERRORS
// ============================================================

export const clearAllUserErrors = () => {
  return (dispatch) => {
    dispatch(userSlice.actions.clearAllErrors());
  };
};

// ============================================================
// ACTIONS
// ============================================================

export const userAction = userSlice.actions;

// ============================================================
// SELECTORS
// ============================================================

export const selectUser = (state) => state.user.user;

export const selectUserInfo = (state) => state.user.userInfo;

export const selectIsAuthenticated = (state) => state.user.isAuthenticated;

export const selectUserLoading = (state) => state.user.loading;

export const selectUserError = (state) => state.user.error;

export const selectUserId = (state) => state.user.userInfo?.id;

export const selectUserStage = (state) => state.user.userInfo?.stage;

export const selectUserPhase = (state) => state.user.userInfo?.phase;

export const selectUserStatus = (state) => state.user.userInfo?.status;

export default userSlice.reducer;




