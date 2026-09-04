import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";
import FilterRow from "./FilterRow";
import StatusRow from "./StatusRow";
import { useDispatch, useSelector } from "react-redux";
import {
  Eye,
  EyeOff,
  Funnel,
  FunnelX,
  Plus,
  RotateCcw,
} from "lucide-react";
import { DateRangeFilter } from "../../DateRangeFilter";
import { todayStr } from "../../../services/dateRangeUtils";
import IconButton from "../Buttons/IconButton"
import SearchBar from "./SearchBar";
import FilterColumn from "./FilterColumn";
import { getPreference, preferencesAction } from "../../../store/Slices/preferencesSlice";
import { queryClient } from "../../../lib/queryClient";
import TableViewport from "./TableViewport";
import useActionMutation from "../../fields/actions/useActionMutation";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import TableTitleBar from "./TableTitleBar";
import { entityKeys } from "@/hooks/useEntity";
import useColumnWidthPersistence from "./hooks/useColumnWidthPersistence";
import { normalizeStatusConfig } from "@/utils/tableLayout";
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

const TableContext = createContext();
export const useTableContext = () => {
  const ctx = useContext(TableContext);
  if (!ctx) {
    throw new Error(
      "You're using table context in wrong place",
    );
  }

  return ctx;
};

/**
 * Is this column published as visible?
 *
 * The layout contract sends real booleans, but this reads 1/"1"/"false" the
 * same way `isActive` in src/utils/sidebarLayout.js does, so one representation
 * changing upstream cannot silently blank a table. Anything unrecognised - and
 * anything missing - counts as visible.
 */
const isColumnVisible = (column) => {
  const value = column?.visible;

  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value) !== "0" && String(value).toLowerCase() !== "false";
};

const TableSkeleton = ({
  columnsLength = 5,
  rows = 6,
}) => {
  return (
    <tbody>
      {Array.from({ length: rows }).map(
        (_, rowIndex) => (
          <tr
            key={rowIndex}
            className="border-b last:border-b-0"
          >
            {Array.from({
              length: columnsLength,
            }).map((_, colIndex) => (
              <td key={colIndex} className="p-4">
                <div className="h-4 w-full rounded bg-gray-300 animate-pulse" />
              </td>
            ))}
          </tr>
        ),
      )}
    </tbody>
  );
};

/* -------------------------------------------------------------------------- */
/*                               FILTER COLUMN                                */
/* -------------------------------------------------------------------------- */



const TableView = ({
  data,
  layout,
  entity,
  statusCount = null,
  preferences,
  searching = true,
  timefilter = true,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  children,
  canAdd = false,
  handleAddClick,
  loading,
}) => {
  const slice = entity;

  const rawStatusConfig =
    layout?.config?.statusConfig ?? EMPTY_ARRAY;

  const rawColumns =
    layout?.config?.columns ?? EMPTY_ARRAY;

  const rawFilterColumns =
    layout?.config?.filterColumns ?? EMPTY_ARRAY;

  /*
   * These keys are primitive strings. If the parent recreates the
   * layout arrays with the same content, the memoized references below
   * remain stable and downstream effects do not fire again.
   */
  const columnsKey = JSON.stringify(rawColumns);
  const filterColumnsKey =
    JSON.stringify(rawFilterColumns);
  const statusConfigKey =
    JSON.stringify(rawStatusConfig);

  const columns = useMemo(
    () => rawColumns,
    [columnsKey]
  );

  const filterColumns = useMemo(
    () => rawFilterColumns,
    [filterColumnsKey]
  );

  const STATUS_CONFIG = useMemo(() => {
    const { items } = normalizeStatusConfig(rawStatusConfig, {
      moduleKey: layout?.moduleKey ?? entity,
      viewKey: layout?.viewKey ?? "table",
    });

    return items.filter((status) => status.visible);
  }, [entity, layout?.moduleKey, layout?.viewKey, statusConfigKey]);

  const timefilterField =
    filterColumns?.[0]?.name || "date_entered";

  const tableName = layout?.label;

  const tableData =
    data?.pages?.flatMap(
      (page) => page.records || page.data || []
    ) ?? EMPTY_ARRAY;

  const pages =
    data?.pages ?? EMPTY_ARRAY;

  const lastPage =
    pages[pages.length - 1] ?? EMPTY_OBJECT;

  const firstPage =
    pages[0] ?? EMPTY_OBJECT;

  const pageIndex =
    lastPage.page ?? 1;

  const pageCount =
    firstPage.total_pages ?? 0;

  const count =
    firstPage.total ?? 0;

  const sort =
    preferences?.sorting ?? EMPTY_OBJECT;

  const dateFilter =
    preferences?.date_filter ?? EMPTY_OBJECT;

  const fromDate =
    dateFilter?.date_from?.split(" ")[0] ||
    todayStr();

  const fromTime =
    dateFilter?.date_from?.split(" ")[1] ||
    "00:01";

  const toDate =
    dateFilter?.date_to?.split(" ")[0] ||
    todayStr();

  const toTime =
    dateFilter?.date_to?.split(" ")[1] ||
    "23:59";

  const filterActive =
    !!dateFilter?.date_from &&
    !!dateFilter?.date_to;

  const filters =
    preferences?.filters ?? EMPTY_OBJECT;

  const searchFields =
    preferences?.search_filter?.search_fields ??
    EMPTY_ARRAY;

  const searchFieldsKey =
    JSON.stringify(searchFields);

  const search = useMemo(
    () => ({
      search:
        preferences?.search_filter?.search || "",
      search_fields: searchFields,
    }),
    [
      preferences?.search_filter?.search,
      searchFieldsKey,
    ]
  );

  const [showStatus, setShowStatus] =
    useState(true);

  const [showFilterColumn, setShowFilterColumn] =
    useState(false);

  const dispatch = useDispatch();
  const navigateTo = useNavigate();

  const [selectedRows, setSelectedRows] =
    useState([]);

  /*
   * visibleColumns is derived from columns, so it does NOT need
   * useState + useEffect synchronization.
   *
   * The previous implementation did:
   *
   *   useEffect(() => {
   *     setVisibleColumns(columns.filter(...));
   *   }, [columns]);
   *
   * which could continuously update when `columns` changed identity.
   */
  const visibleColumns = useMemo(
    () => columns.filter(isColumnVisible),
    [columns]
  );

  const [columnWidths, setColumnWidths] =
    useState(() => {
      const widths = {};

      columns.forEach((column) => {
        widths[column.accessor] = {
          width: column.width ?? 220,
          minWidth: column.minWidth ?? 120,
          maxWidth: column.maxWidth ?? 700,
          sticky: column.sticky ?? false,
        };
      });

      return widths;
    });

  /*
   * Synchronize published column definitions with local widths.
   *
   * IMPORTANT:
   * Returning `previousWidths` when the values are identical prevents
   * an unnecessary state update and therefore prevents an effect/render
   * feedback loop.
   */
  useEffect(() => {
    setColumnWidths((previousWidths) => {
      const nextWidths = {};

      columns.forEach((column) => {
        const previous =
          previousWidths[column.accessor];

        nextWidths[column.accessor] = {
          width:
            previous?.width ??
            column.width ??
            220,

          minWidth:
            column.minWidth ?? 120,

          maxWidth:
            column.maxWidth ?? 700,

          sticky:
            column.sticky ?? false,
        };
      });

      const previousKeys =
        Object.keys(previousWidths);

      const nextKeys =
        Object.keys(nextWidths);

      const unchanged =
        previousKeys.length ===
        nextKeys.length &&
        nextKeys.every((key) => {
          const previous =
            previousWidths[key];

          const next =
            nextWidths[key];

          return (
            previous?.width ===
            next.width &&
            previous?.minWidth ===
            next.minWidth &&
            previous?.maxWidth ===
            next.maxWidth &&
            previous?.sticky ===
            next.sticky
          );
        });

      if (unchanged) {
        return previousWidths;
      }

      return nextWidths;
    });
  }, [columns]);

  const resizeColumn = useCallback((accessor, width) => {
    setColumnWidths((prev) => {
      const current = prev[accessor];

      if (!current) return prev;

      return {
        ...prev,
        [accessor]: {
          ...current,
          width: Math.max(
            current.minWidth,
            Math.min(width, current.maxWidth)
          ),
        },
      };
    });
  }, []);

  /**
   * Store a finished resize on the CRM.
   *
   * A column width is a published presentation value, not local UI state, so
   * dragging an edge here writes the same `outr_ui_properties` override the
   * Table View layout editor writes. The drag updates the screen immediately;
   * this persists the width the user stopped on and re-reads the layout so the
   * stored value becomes the rendered one.
   *
   * `resizeColumn` is passed as the rollback, so a rejected write puts the
   * pre-drag width back rather than leaving the header showing a size the CRM
   * does not have.
   */
  const { commitColumnWidth, savingColumns } =
    useColumnWidthPersistence({
      columns,
      moduleKey: entity,
      viewKey: "table",
      applyWidth: resizeColumn,
    });
  const gridTemplate = useMemo(() => {
    return visibleColumns
      .map(
        (column) =>
          `${columnWidths[column.accessor]?.width || 220}px`
      )
      .join(" ");

  }, [visibleColumns, columnWidths]);
  const stickyColumns = useMemo(() => {
    let left = 0;

    return visibleColumns.map((column) => {
      const current = {
        ...column,
        width: columnWidths[column.accessor]?.width || 220,
        left,
      };

      if (column.sticky) {
        left += current.width;
      }

      return current;
    });
  }, [visibleColumns, columnWidths]);
  const updateSearch = (value) => {
    dispatch(
      preferencesAction.updateTablePreference({
        table: entity,
        key: "search_filter",
        value,
      })
    );
  };
  const updateFilters = (value) => {
    dispatch(
      preferencesAction.updateTablePreference({
        table: entity,
        key: "filters",
        value,
      })
    );
  };
  const toggleSort = (value) => {
    dispatch(
      preferencesAction.updateTablePreference({
        table: entity,
        key: "sorting",
        value: value
      })
    );
  };
  const updateDateFilter = (
    date_from,
    date_to
  ) => {
    dispatch(
      preferencesAction.updateTablePreference({
        table: entity,
        key: "date_filter",
        value: {
          date_range: "custom",
          date_from,
          date_to,
          date_field: timefilterField
        },
      })
    );
  };
  const handleResetFilter = () => {
    dispatch(
      preferencesAction.updateTablePreference({
        table: entity,
        key: "date_filter",
        value: {
          date_from: "",
          date_to: "",
          date_range: "",
          date_field: ""
        },
      })
    );
  };
  const handleRefresh = async () => {

    queryClient.resetQueries({
      queryKey: entityKeys.allByEntity(entity),
    });
  };
  const actionMutation =
    useActionMutation();

  const actionContext = useMemo(
    () => ({
      navigate: navigateTo,

      // user: currentUser,

      mutateAsync:
        actionMutation.mutateAsync,

      queryClient,

      toast,

      // openModal,

      onActionSuccess: () => {
        queryClient.invalidateQueries({
          queryKey:
            entityKeys.allByEntity(entity),
        });
      },

      // onActionError,
    }),
    [
      navigateTo,
      actionMutation.mutateAsync,
      entity,
    ]
  );

  const value = useMemo(
    () => ({
      tableName,
      layout,
      columns,
      statusConfig: STATUS_CONFIG,

      visibleColumns,

      columnWidths,
      resizeColumn,

      /* Persists a finished resize to the CRM. */
      commitColumnWidth,
      savingColumns,

      gridTemplate,
      stickyColumns,

      showStatus,
      setShowStatus,

      search,
      setSearch: updateSearch,

      filters,
      setFilters: updateFilters,

      slice,
      entity,

      sort,
      toggleSort,

      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,

      searching,

      timefilter,

      filterColumns,

      loading,

      selectedRows,
      setSelectedRows,

      pageIndex,
      pageCount,

      count,
      data: tableData,
      actionContext,
    }),
    [
      tableName,
      layout,
      columns,
      STATUS_CONFIG,
      visibleColumns,
      columnWidths,
      resizeColumn,
      commitColumnWidth,
      savingColumns,
      gridTemplate,
      stickyColumns,
      showStatus,
      search,
      filters,
      slice,
      entity,
      sort,
      toggleSort,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      searching,
      timefilter,
      filterColumns,
      loading,
      selectedRows,
      pageIndex,
      pageCount,
      count,
      tableData,
      actionContext,
    ]
  );

  return (
    <TableContext.Provider value={value}>
      <motion.div
        className="flex flex-col gap-3 mb-10"
      >
        {/* FILTER ROW */}
        <FilterRow />

        {/* STATUS ROW */}
        <motion.div
          initial={false}
          animate={{
            height: showStatus ? "auto" : 0,
            opacity: showStatus ? 1 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 18,
          }}
          style={{ overflow: "hidden" }}
        >
          {STATUS_CONFIG.length > 0 &&
            count >= 0 && (
              <StatusRow />
            )}
        </motion.div>

        {/* TOOLBAR ROW */}
        <div className="flex flex-wrap items-center gap-2 bg-white border rounded-xl p-2 sm:gap-3 sm:p-3">
          <div className="order-1 flex items-center gap-2 lg:order-none">
            {/* FILTER TOGGLE */}
            {filterColumns.length > 0 && <IconButton
              onClick={() =>
                setShowFilterColumn(
                  (prev) => !prev,
                )
              }
              className="h-10 w-10 rounded-lg border bg-white hover:bg-gray-100 transition flex items-center justify-center"
              icon={showFilterColumn ? Funnel : FunnelX}
              label={showFilterColumn ? "Hide Filters" : "Show Filter"}
            />}



            {/* STATUS TOGGLE */}
            {STATUS_CONFIG.length > 0 && <IconButton
              onClick={() =>
                setShowStatus((prev) => !prev)
              }
              className="h-10 w-10 rounded-lg border bg-white hover:bg-gray-100 transition flex items-center justify-center"
              icon={showStatus ? Eye : EyeOff}
              label={showStatus ? "Hide Stats" : "Show Stats"}
            />}


          </div>
          {timefilter && <div className="order-3 w-full min-w-0 lg:order-none lg:w-auto lg:max-w-md lg:flex-1">
            <DateRangeFilter
              fromDate={fromDate}
              fromTime={fromTime}
              toDate={toDate}
              toTime={toTime}
              filterActive={filterActive}
              onApply={({
                fromDate,
                fromTime,
                toDate,
                toTime,
              }) =>
                updateDateFilter(
                  `${fromDate} ${fromTime}`,
                  `${toDate} ${toTime}`
                )
              }
              onReset={handleResetFilter}
            />
          </div>}
          {searching && <div className="order-4 w-full min-w-0 lg:order-none lg:w-auto">
            <SearchBar />
          </div>}
          <div className="order-2 ml-auto flex gap-2 lg:order-none">
            {canAdd && <IconButton
              onClick={handleAddClick}
              className="h-10 w-10 rounded-lg border bg-white hover:bg-gray-100 transition flex items-center justify-center"
              icon={Plus}
              label="Create"
            />}

            <IconButton
              onClick={handleRefresh}
              className="h-10 w-10 rounded-lg border bg-white hover:bg-gray-100 transition flex items-center justify-center"
              icon={RotateCcw}
              label="Refresh"
            />
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row">
          {showFilterColumn && filterColumns.length > 0 && <FilterColumn />}

          {/* TABLE */}
          <motion.div
            className="flex-1 rounded-xl border overflow-hidden relative bg-white"
          >
            <TableTitleBar />
            <Table />

            {/* TABLE LOADING */}
            {loading &&
              pageIndex === 1 && tableData.length == 0 && (
                <table className="w-full">
                  <TableSkeleton
                    columnsLength={
                      visibleColumns?.length || 5
                    }
                  />
                </table>
              )}

            {/* EMPTY STATE */}
            {!loading && tableData?.length === 0 && <EmptyCard />}
          </motion.div>
        </div>
      </motion.div>
    </TableContext.Provider>
  );
};

/**
 * Below `lg` the grid tracks defined in `layoutStyle` can't fit the viewport, so
 * the table gets a min-width and its wrapper scrolls horizontally instead of
 * clipping. Derived from the `layoutStyle` grid template: explicit px tracks are
 * kept as-is, flexible tracks get FLEX_TRACK_MIN. Pages can override with the
 * `minWidth` prop.
 */
const FLEX_TRACK_MIN = 150;

export const getTableMinWidth = (layoutStyle = "", columnCount = 0) => {
  const arbitrary = /grid-cols-\[([^\]]+)\]/.exec(layoutStyle);

  if (arbitrary) {
    return arbitrary[1]
      .split("_")
      .filter(Boolean)
      .reduce((total, track) => {
        const px = /^(\d+(?:\.\d+)?)px$/.exec(track.trim());
        return total + (px ? Number(px[1]) : FLEX_TRACK_MIN);
      }, 0);
  }

  const numbered = /grid-cols-(\d+)/.exec(layoutStyle);
  const cols = Number(numbered?.[1]) || columnCount || 1;

  return cols * FLEX_TRACK_MIN;
};

export const Table = ({
  className = "",
  style = {},
  ...props
}) => {
  return (
    <div
      className={`relative flex max-h-[500px] w-full flex-col overflow-hidden ${className} `}
      style={style}
    >
      <TableViewport />
    </div>
  );
};
function EmptyCard() {
  const { tableName } = useTableContext()
  return <div className="flex flex-col items-center justify-center py-10 px-6 bg-white border-t">
    <div className="text-5xl mb-4">
      📭
    </div>

    <h3 className="text-xl font-semibold text-gray-700">
      No {tableName} Available
    </h3>

    <p className="text-sm text-gray-500 mt-2 text-center max-w-md">
      There are currently no
      records to display here.
      Once new data is available,
      it will automatically appear.
    </p>
  </div>
}



export default TableView;
