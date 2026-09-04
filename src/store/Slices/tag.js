import { createSlice } from "@reduxjs/toolkit";
import { showConsole } from "../../assets/assets";
import { fetchGpc } from "../../services/api";

const tagSlice = createSlice({
  name: "tag",
  initialState: {
    loading: false,
    pageCount: 1,
    pageIndex: 1,
    tags: [],
    count: 0,
    error: null,
    creating: false,
    createSuccess: false,
    deleting: false,
    deleteTagId: null,
    updating: false,
  },
  reducers: {
    getTagsRequest(state) {
      state.loading = true;
      state.error = null;
    },
    getTagsSuccess(state, action) {
      const { count, tags, pageCount, pageIndex } = action.payload;
      state.loading = false;
      state.tags = tags;
      state.count = count;
      state.pageCount = pageCount;
      state.pageIndex = pageIndex;
      state.error = null;
    },
    getTagsFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Create tag reducers
    createTagRequest(state) {
      state.creating = true;
      state.createSuccess = false;
      state.error = null;
    },
    createTagSuccess(state, action) {
      state.creating = false;
      state.createSuccess = true;
      state.error = null;
    },
    createTagFailed(state, action) {
      state.creating = false;
      state.createSuccess = false;
      state.error = action.payload;
    },

    clearAllErrors(state) {
      state.error = null;
    },
    resetCreateStatus(state) {
      state.createSuccess = false;
      state.creating = false;
    },
    deleteTagRequest(state, action) {
      state.deleting = true;
      state.deleteTagId = action.payload;
    },

    deleteTagSuccess(state) {
      state.deleting = false;
      state.deleteTagId = null;
    },

    deleteTagFailed(state, action) {
      state.deleting = false;
      state.deleteTagId = null;
      state.error = action.payload;
    },

    updateTagRequest(state) {
      state.updating = true;
    },

    updateTagSuccess(state) {
      state.updating = false;
    },

    updateTagFailed(state, action) {
      state.updating = false;
      state.error = action.payload;
    },
  },
});

// Get tags function
export const getTags = (page = 1, pageSize = 50) => {
  return async (dispatch, getState) => {
    dispatch(tagSlice.actions.getTagsRequest());

    try {
      const data = await fetchGpc({
        params: { type: "tag_manager" },
      });

      showConsole && console.log(`Tag data:`, data);

      dispatch(
        tagSlice.actions.getTagsSuccess({
          count: data.data_count ?? 0,
          tags: data.data || [],
          pageCount: data.total_pages || 1,
          pageIndex: data.current_page || 1,
        }),
      );
      dispatch(tagSlice.actions.clearAllErrors());
    } catch (error) {
      console.log("Error fetching tags:", error);
      dispatch(tagSlice.actions.getTagsFailed("Fetching tags failed"));
    }
  };
};

// Create tag function
// Create tag function - make sure it returns a Promise properly
export const createTag = (tagName, tagType) => {
  return async (dispatch, getState) => {
    dispatch(tagSlice.actions.createTagRequest());

    try {
      const data = await fetchGpc({
        params: { type: "tag_manager" },
        body: { tag_name: tagName, tag_type: tagType },
        method: "POST",
      });
      showConsole && console.log(`Create tag response:`, data);
      dispatch(tagSlice.actions.createTagSuccess());
    } catch (error) {
      console.log("Error creating tag:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.output ||
        error.message ||
        "Failed to create tag";
      dispatch(tagSlice.actions.createTagFailed(errorMessage));

      return Promise.reject(new Error(errorMessage));
    }
  };
};

export const deleteTag = (id) => {
  return async (dispatch) => {
    dispatch(tagSlice.actions.deleteTagRequest(id));

    try {
      const res = await fetchGpc({
        method: "DELETE",
        params: { type: "tag_manager" },
        body: { id },
      });

      if (!res.success) {
        throw new Error(res.message || "Delete failed");
      }

      dispatch(tagSlice.actions.deleteTagSuccess());

      // refresh list
      dispatch(getTags());
    } catch (error) {
      dispatch(
        tagSlice.actions.deleteTagFailed(error.message || "Delete failed"),
      );
    }
  };
};

export const updateTag = (payload) => {
  return async (dispatch) => {
    dispatch(tagSlice.actions.updateTagRequest());

    try {
      const res = await fetchGpc({
        method: "PUT",
        params: { type: "tag_manager" },
        body: payload,
      });

      if (!res.success) {
        throw new Error(res.message || "Update failed");
      }

      dispatch(tagSlice.actions.updateTagSuccess());

      // refresh list
      dispatch(getTags());
    } catch (error) {
      dispatch(
        tagSlice.actions.updateTagFailed(error.message || "Update failed"),
      );
    }
  };
};

export const tagActions = tagSlice.actions;
export default tagSlice.reducer;
