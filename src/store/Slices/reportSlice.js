// store/Slices/reportSlice.js
import { createSlice } from "@reduxjs/toolkit";
const defaultPagination = {
  pageIndex: 1,
  pageCount: 1,
  totalRecords: 0,
};

const initialState = {
  // ── Stage level (top-level, no stage/category selected) ─────────────────────
  stages: {
    rows: [],
    ...defaultPagination,
  },

  // ── Category level (a stage is open) ────────────────────────────────────────
  categories: {
    rows: [],
    openStage: "",      // which stage is expanded
    ...defaultPagination,
  },

  // ── Detail / record level (a category is open) ───────────────────────────────
  details: {
    rows: [],
    openCategory: "",   // which category is expanded
    ...defaultPagination,
  },

  // ── Shared stats from any response ──────────────────────────────────────────
  stats: {},

  // ── Loading flags ────────────────────────────────────────────────────────────
  stagesLoading:     false,
  categoriesLoading: false,
  detailsLoading:    false,

  // ── Error ────────────────────────────────────────────────────────────────────
  error: "",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const parsePagination = (apiPagination = {}, totalRecords = 0) => ({
  pageIndex:    Number(apiPagination.page        ?? 1),
  pageCount:    Number(apiPagination.totalPages  ?? 1),
  totalRecords: Number(totalRecords),
});

// ─── slice ────────────────────────────────────────────────────────────────────

const reportSlice = createSlice({
  name: "report",
  initialState,
  reducers: {
    // ── Stages ──────────────────────────────────────────────────────────────────

    setStagesLoading(state, { payload }) {
      state.stagesLoading = payload;
    },

    /**
     * Payload: { records, pagination, stats, total_records }
     */
    setStagesData(state, { payload }) {
      const { records = [], pagination = {}, stats = {}, total_records = 0 } = payload;
      state.stages.rows         = records.filter((r) => r?.stage);
      state.stats               = stats;
      Object.assign(state.stages, parsePagination(pagination, total_records));

      // Reset children when stages reload
      state.categories          = { ...initialState.categories };
      state.details             = { ...initialState.details };
    },

    setStagesPage(state, { payload: page }) {
      state.stages.pageIndex = page;
    },

    // ── Categories ──────────────────────────────────────────────────────────────

    setCategoriesLoading(state, { payload }) {
      state.categoriesLoading = payload;
    },

    /**
     * Payload: { stageName, records, pagination, total_records }
     */
    setCategoriesData(state, { payload }) {
      const { stageName, records = [], pagination = {}, total_records = 0 } = payload;
      state.categories.openStage  = stageName;
      state.categories.rows       = records.filter((r) => r?.category);
      Object.assign(state.categories, parsePagination(pagination, total_records));

      // Reset details when categories reload
      state.details = { ...initialState.details };
    },

    setCategoriesPage(state, { payload: page }) {
      state.categories.pageIndex = page;
    },

    toggleStage(state, { payload: stageName }) {
      if (state.categories.openStage === stageName) {
        // Collapse
        state.categories = { ...initialState.categories };
        state.details    = { ...initialState.details };
      }
      // Opening is handled by setCategoriesData after fetch
    },

    // ── Details ─────────────────────────────────────────────────────────────────

    setDetailsLoading(state, { payload }) {
      state.detailsLoading = payload;
    },

    /**
     * Payload: { categoryName, records, pagination, total_records }
     */
    setDetailsData(state, { payload }) {
      const { categoryName, records = [], pagination = {}, total_records = 0 } = payload;
      state.details.openCategory = categoryName;
      state.details.rows         = records;
      Object.assign(state.details, parsePagination(pagination, total_records));
    },

    setDetailsPage(state, { payload: page }) {
      state.details.pageIndex = page;
    },

    toggleCategory(state, { payload: categoryName }) {
      if (state.details.openCategory === categoryName) {
        // Collapse
        state.details = { ...initialState.details };
      }
      // Opening is handled by setDetailsData after fetch
    },

    // ── Error ────────────────────────────────────────────────────────────────────

    setError(state, { payload }) {
      state.error = payload;
    },

    clearError(state) {
      state.error = "";
    },

    // ── Full reset (phase switch / filter apply) ─────────────────────────────────

    resetReport() {
      return { ...initialState };
    },
  },
});

export const {
  setStagesLoading,
  setStagesData,
  setStagesPage,
  setCategoriesLoading,
  setCategoriesData,
  setCategoriesPage,
  toggleStage,
  setDetailsLoading,
  setDetailsData,
  setDetailsPage,
  toggleCategory,
  setError,
  clearError,
  resetReport,
} = reportSlice.actions;

export default reportSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectStages         = (s) => s.report.stages;
export const selectCategories     = (s) => s.report.categories;
export const selectDetails        = (s) => s.report.details;
export const selectReportStats    = (s) => s.report.stats;
export const selectStagesLoading  = (s) => s.report.stagesLoading;
export const selectCatsLoading    = (s) => s.report.categoriesLoading;
export const selectDetsLoading    = (s) => s.report.detailsLoading;
export const selectReportError    = (s) => s.report.error;