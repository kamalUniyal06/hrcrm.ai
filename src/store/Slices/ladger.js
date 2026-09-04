import { createSlice } from "@reduxjs/toolkit";
import { showConsole } from "../../assets/assets";
import { clearSectionCache, getCache, setCache } from "../../services/cache";
import { fetchGpc } from "../../services/api";

const ladgerSlice = createSlice({
  name: "ladger",
  initialState: {
    loading: false,
    childLoading: false,
    email: localStorage.getItem("email") || null,
    ladger: [],
    ladgerChild: [],
    noSearchResultData: null,
    pageCount: 1,
    pageIndex: 1,
    error: null,
    timeline: localStorage.getItem("timeline") || "today",
    message: null,
    duplicate: 0,
    noSearchFoundLoading: false,
    manualScanResponse: null,
    manualScanLoading: false,
  },
  reducers: {
    getLadgerRequest(state) {
      state.loading = true;
      state.ladger = [];
      state.error = null;
      state.email = null;
    },

    getLadgerSuccess(state, action) {
      const {
        duplicate,
        ladger,
        email,
      } = action.payload;

      state.loading = false;
      state.ladger = ladger;
      state.email = email || null;
      state.duplicate = duplicate || 0;
      state.error = null;
    },

    getLadgerFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.ladger = []
    },
    getLadgerChildRequest(state) {
      state.childLoading = true;
      state.ladgerChild = [];
      state.error = null;
    },

    getLadgerChildSuccess(state, action) {
      const {
        ladgerChild,
        pageCount,
        pageIndex,
      } = action.payload;

      state.childLoading = false;
      if (pageIndex === 1) {
        state.ladgerChild = ladgerChild;
      } else {
        state.ladgerChild = [...state.ladgerChild, ...ladgerChild];
      }
      state.pageCount = pageCount || 1;
      state.pageIndex = pageIndex || 1;
      state.error = null;
    },

    getLadgerChildFailed(state, action) {
      state.childLoading = false;
      state.error = action.payload;
      state.ladgerChild = []
    },

    setTimeline(state, action) {
      state.timeline = action.payload;
      localStorage.setItem("timeline", action.payload);
    },




    manualScanRequest(state) {
      state.manualScanLoading = true;
      state.manualScanResponse = null;
      state.error = null;
    },
    manualScanSuccess(state, action) {
      state.manualScanLoading = false;
      state.manualScanResponse = action.payload;
    },
    manualScanFailed(state, action) {
      state.manualScanLoading = false;
      state.error = action.payload
    },

    clearAllErrors(state) {
      state.error = null;
    },

    updateIndex(state, action) {
      state.pageIndex = action.payload;
    },

  },
});

export const getLadger = ({
  email = null,
  loading = true,
  page = 1,
  force = false,
  brand = false
}) => {
  return async (dispatch, getState) => {
    const trimmedEmail = email?.trim() || "";
    const timeline = getState().ladger.timeline;

    const buildCacheKey = (targetEmail, targetPage = 1) =>
      `${targetEmail?.trim() || ""}_${targetPage}_${timeline || "all"}`;

    const cacheKey = buildCacheKey(trimmedEmail, page);
    clearSectionCache('ledgers_child')
    if (loading) {
      dispatch(ladgerSlice.actions.getLadgerRequest());
    }

    try {
      // Serve cache instantly
      if (!(force || brand)) {
        const cachedData = getCache("ledgers", cacheKey);

        if (cachedData) {
          dispatch(
            ladgerSlice.actions.getLadgerSuccess({
              duplicate: cachedData.duplicate,
              ladger: cachedData.ladger,
              email: trimmedEmail,
              pageCount: cachedData.pageCount,
              pageIndex: cachedData.pageIndex,
            })
          );
        }
      }

      // Fetch fresh current ledger
      let res;
      const timeline = getState().ladger.timeline
      const params = { ...(timeline && timeline !== "null" ? { filter: timeline } : {}), email: trimmedEmail, page, page_size: "10" }
      brand ? res = await fetchGpc({ params: { type: "brandTimeline", case: "timeline", ...params } })
        : res = await fetchGpc({ params: { type: 'get_card_ledger', ...params } });
      const data = brand ? res.data.timeline : res
      console.log(`${brand && "BRAND"} LADGER`, data)
      const freshData = {
        duplicate: data.duplicate_threads_count,
        ladger: data.data ?? [],
        pageCount: data.total_pages,
        pageIndex: data.current_page,
      };

      !brand && setCache("ledgers", cacheKey, freshData);

      dispatch(
        ladgerSlice.actions.getLadgerSuccess({
          duplicate: freshData.duplicate,
          ladger: freshData.ladger,
          email: trimmedEmail,
          pageCount: freshData.pageCount,
          pageIndex: freshData.pageIndex,
        })
      );

      // PREFETCH NEXT / PREV EMAIL LEDGER
      const index = localStorage.getItem("currentIndex") && Number(localStorage.getItem("currentIndex"))

      if (index !== null) {
        const unreplied = getState().unreplied;

        const nextEmail =
          index + 1 < unreplied.count
            ? unreplied.emails[index + 1]?.email1
            : null;

        const prevEmail =
          index > 0
            ? unreplied.emails[index - 1]?.email1
            : null;

        [nextEmail, prevEmail].forEach(async (prefetchEmail) => {
          if (!prefetchEmail) return;

          const prefetchCacheKey = buildCacheKey(prefetchEmail, 1);

          if (!getCache("ledgers", prefetchCacheKey)) {
            try {
              const params = { ...(timeline && timeline !== "null" ? { filter: timeline } : {}), email: prefetchEmail.trim(), page: 1, page_size: "10" }
              const data = await fetchGpc({ params: { type: "get_card_ledger", ...params } });
              setCache("ledgers", prefetchCacheKey, {
                duplicate: data.duplicate_threads_count,
                ladger: data.data ?? [],
                pageCount: data.total_pages,
                pageIndex: data.current_page,
              });
            } catch (err) {
              console.error("Ledger Prefetch Failed", err);
            }
          }
        });
      }

      dispatch(ladgerSlice.actions.clearAllErrors());
    } catch (error) {
      dispatch(ladgerSlice.actions.getLadgerFailed("Failed To Get Ladger"));
    }
  };
};
export const getLadgerChild = ({
  loading = true,
  page = 1,
  force = false,
  parentId,
}) => {
  return async (dispatch, getState) => {
    const timeline = getState().ladger.timeline;

    const buildCacheKey = (parentId, targetPage = 1) =>
      `${parentId?.trim() || ""}_${targetPage}_${timeline || "all"}`;

    const cacheKey = buildCacheKey(parentId, page);

    if (loading) {
      dispatch(ladgerSlice.actions.getLadgerChildRequest());
    }

    try {
      // Serve cache instantly
      if (!(force)) {
        const cachedData = getCache("ledgers_child", cacheKey);

        if (cachedData) {
          dispatch(
            ladgerSlice.actions.getLadgerChildSuccess({
              ladgerChild: cachedData.ladgerChild,
              pageCount: cachedData.pageCount,
              pageIndex: cachedData.pageIndex,
            })
          );
        }
      }

      const params = { ...(timeline && timeline !== "null" ? { filter: timeline } : {}), page, page_size: "10" }
      const data = await fetchGpc({ params: { type: 'timeline_ledger', ...params }, method: "POST", body: { id: parentId } });
      console.log(`CHILD LADGER`, data)
      const freshData = {
        ladgerChild: data.data ?? [],
        pageCount: data.total_pages,
        pageIndex: data.current_page,
      };

      setCache("ledgers_child", cacheKey, freshData);
      dispatch(
        ladgerSlice.actions.getLadgerChildSuccess({
          ladgerChild: freshData.ladgerChild,
          pageCount: freshData.pageCount,
          pageIndex: freshData.pageIndex,
        })
      );
      dispatch(ladgerSlice.actions.clearAllErrors());
    } catch (error) {
      dispatch(ladgerSlice.actions.getLadgerChildFailed("Failed To Get Ladger Child"));
    }
  };
};



export const manualEmailScan = (messageId, email, threadId) => {
  return async (dispatch, getState) => {
    dispatch(ladgerSlice.actions.manualScanRequest());
    try {

      const data = await fetchGpc({ params: { type: 'manual_scanning', message_id: messageId, email, thread_id: threadId } }
      );
      showConsole && console.log("ManualScan", data);
      dispatch(ladgerSlice.actions.manualScanSuccess(data));

      dispatch(ladgerSlice.actions.clearAllErrors());
    } catch (error) {
      dispatch(
        ladgerSlice.actions.manualScanSuccess({
          status: 404,
          message: error.response?.data?.message || "Not Found",
        }),
      );
    }
  };
};

export const ladgerAction = ladgerSlice.actions;
export default ladgerSlice.reducer;
