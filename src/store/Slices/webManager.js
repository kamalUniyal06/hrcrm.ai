import { createSlice } from "@reduxjs/toolkit";
import { showConsole } from "../../assets/assets";
import { apiRequest, fetchGpc } from "../../services/api";
import { CREATE_DEAL_API_KEY } from "../constants";

const ALLOWED_SITES_MODULE = "outr_allowed_sites";

const getPostAllEndpoint = (crmEndpoint) =>
  `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all`;

const getPostAllHeaders = () => ({
  "x-api-key": CREATE_DEAL_API_KEY,
  "Content-Type": "application/json",
});

const toAllowedSitePayload = (website) => {
  const rest = { ...website };
  delete rest.type;
  return {
    module: ALLOWED_SITES_MODULE,
    ...rest,
  };
};

const webManagerSlice = createSlice({
  name: "webManager",
  initialState: {
    loading: false,
    websites: [],
    count: 0,
    error: null,
    message: null,
    creating: false,
    updating: false,
    deleting: false,
    deleteWebsiteId: null,
  },
  reducers: {
    getWebsitesRequest(state) {
      state.loading = true;
      state.error = null;
    },
    getWebsitesSucess(state, action) {
      const { count, websites, summary = null } = action.payload;
      state.loading = false;
      state.websites = websites;
      state.summary = summary;
      state.count = count;
      state.error = null;
    },
    getWebsitesFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    createWebsiteRequest(state) {
      state.creating = true;
      state.message = null;
      state.error = null;
    },
    createWebsiteSuccess(state, action) {
      state.creating = false;
      state.message = action.payload.message;
      state.error = null;
    },
    createWebsiteFailed(state, action) {
      state.creating = false;
      state.error = action.payload;
      state.message = null;
    },
    updateWebsiteRequest(state) {
      state.updating = true;
      state.message = null;
      state.error = null;
    },
    updateWebsiteSuccess(state, action) {
      state.updating = false;
      state.message = action.payload.message;
      state.websites = state.websites.map((website) =>
        website.id === action.payload.website.id
          ? { ...website, ...action.payload.website }
          : website,
      );
      state.error = null;
    },
    updateWebsiteFailed(state, action) {
      state.updating = false;
      state.error = action.payload;
      state.message = null;
    },
    deleteWebsiteRequest(state, action) {
      state.deleting = true;
      state.error = null;
      state.deleteWebsiteId = action.payload.id;
    },
    deleteWebsiteSuccess(state, action) {
      state.deleting = false;
      state.deleteWebsiteId = null;
      state.websites = state.websites.filter(
        (website) => website.id !== action.payload.id,
      );
      state.count = action.payload.count;
      state.message = action.payload.message;
      state.error = null;
    },
    deleteWebsiteFailed(state, action) {
      state.deleting = false;
      state.error = action.payload;
      state.deleteWebsiteId = null;
    },
    clearAllMessages(state) {
      state.message = null;
    },
    clearAllErrors(state) {
      state.error = null;
    },
  },
});

const assertSuccess = (data) => {
  if (data?.success === false) {
    throw new Error(data.message);
  }
};

export const getManageWeb = (loading = true) => {
  return async (dispatch, getState) => {
    if (loading) {
      dispatch(webManagerSlice.actions.getWebsitesRequest());
    }
    try {
      const { crmEndpoint } = getState().user;
      if (!crmEndpoint) {
        throw new Error("CRM endpoint missing");
      }

      const data = await apiRequest({
        endpoint: getPostAllEndpoint(crmEndpoint),
        method: "POST",
        params: { action_type: "get_data" },
        body: { module: ALLOWED_SITES_MODULE },
        headers: getPostAllHeaders(),
      });
      showConsole && console.log(`WEBSITE MANAGER SITEs`, data);
      if (data?.success === false) {
        throw new Error(data.message);
      }
      const websites = Array.isArray(data) ? data : data.data ?? [];
      dispatch(
        webManagerSlice.actions.getWebsitesSucess({
          count: data.data_count ?? websites.length,
          websites,
          summary: data.summary ?? null,
        }),
      );
      dispatch(webManagerSlice.actions.clearAllErrors());
    } catch (error) {
      dispatch(
        webManagerSlice.actions.getWebsitesFailed(
          error.message ?? "Fetching Manger Website Failed",
        ),
      );
    }
  };
};

export const createWebsite = (website) => {
  return async (dispatch, getState) => {
    dispatch(webManagerSlice.actions.createWebsiteRequest());
    console.log(website);

    try {
      const { crmEndpoint } = getState().user;
      if (!crmEndpoint) {
        throw new Error("CRM endpoint missing");
      }

      const data = await apiRequest({
        endpoint: getPostAllEndpoint(crmEndpoint),
        method: "POST",
        params: { action_type: "post_data" },
        body: {
          parent_bean: toAllowedSitePayload(website),
        },
        headers: getPostAllHeaders(),
      });

      showConsole && console.log("Create Manager Website", data);
      assertSuccess(data);
      dispatch(
        webManagerSlice.actions.createWebsiteSuccess({
          message: data.message ?? "Website Created Successfully",
        }),
      );
      dispatch(getManageWeb(false));
      dispatch(webManagerSlice.actions.clearAllErrors());
    } catch (error) {
      dispatch(
        webManagerSlice.actions.createWebsiteFailed(
          error.message ?? "Website Creation Failed",
        ),
      );
    }
  };
};

export const updateWebsite = (website, options = {}) => {
  const { successMessage, failureMessage } = options;
  return async (dispatch, getState) => {
    dispatch(webManagerSlice.actions.updateWebsiteRequest());

    try {
      const { crmEndpoint } = getState().user;
      if (!crmEndpoint) {
        throw new Error("CRM endpoint missing");
      }

      const data = await apiRequest({
        endpoint: getPostAllEndpoint(crmEndpoint),
        method: "POST",
        params: { action_type: "post_data" },
        body: {
          parent_bean: toAllowedSitePayload(website),
        },
        headers: getPostAllHeaders(),
      });

      showConsole && console.log("Update Manager Website", data);
      assertSuccess(data);
      dispatch(
        webManagerSlice.actions.updateWebsiteSuccess({
          website: website,
          message:
            successMessage ?? data.message ?? "Website Updated Successfully",
        }),
      );
      dispatch(getManageWeb(false));
      dispatch(webManagerSlice.actions.clearAllErrors());
    } catch (error) {
      dispatch(
        webManagerSlice.actions.updateWebsiteFailed(
          error.message ?? failureMessage ?? "Website Update Failed",
        ),
      );
    }
  };
};

export const deleteWebsite = (website) => {
  return async (dispatch, getState) => {
    dispatch(webManagerSlice.actions.deleteWebsiteRequest({ id: website.id }));

    try {
      const payload = {
        id: website.id,
        website_name:
          website.website_name || website.name || website.website || "",
      };
      const data = await fetchGpc({
        method: "DELETE",
        params: { type: "get_website" },
        body: payload,
      });

      showConsole && console.log("Delete Manager Website", data);
      assertSuccess(data);
      dispatch(
        webManagerSlice.actions.deleteWebsiteSuccess({
          id: website.id,
          count: Math.max((getState().webManager.count ?? 1) - 1, 0),
          message: data.message ?? "Website Deleted Successfully",
        }),
      );
      dispatch(getManageWeb(false));
      dispatch(webManagerSlice.actions.clearAllErrors());
    } catch (error) {
      dispatch(
        webManagerSlice.actions.deleteWebsiteFailed(
          error.message ?? "Website Delete Failed",
        ),
      );
    }
  };
};

export const webManagerAction = webManagerSlice.actions;
export default webManagerSlice.reducer;
