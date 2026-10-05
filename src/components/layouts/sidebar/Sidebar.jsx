import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
  ChevronDown,
  GripVertical,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Trash2,
  Wrench,
} from "lucide-react";

import IconInput from "@/components/IconInput";

import Icon from "@/components/ui/Icon/Icon";

import {
  useCrmModules,
  useLayoutPreferences,
  useUpdateLayout,
} from "@/queries/prefrences.queries";

import {
  isPersistableId,
  normalizeSidebarResponse,
  toVisibilityFlag,
} from "@/utils/sidebarLayout";
import { resolveSidebarModules } from "@/utils/sidebarModules";

import {
  RANK_FIELD,
  RankScopeError,
  inspectRankScope,
  reorderCopy,
  resolveMoveNeighborIds,
} from "@/utils/rank";

import { requestRankMove } from "@/api/rank.api";

import { moveSidebarModuleRelationship, moveSidebarProfileModule } from "@/api/sidebar.api";
import { isSidebarProfilePair, planSidebarProfileMove } from "@/utils/sidebarProfileMove";
import { rebalanceAbove } from "@/utils/uiRank";

import {
  fetchLayout,
  fetchSidebarComponentId,
} from "@/api/prefrences.api";

import { preferenceKeys } from "@/queries/prefrences.queries";

import { useQueryClient } from "@tanstack/react-query";

import toast from "react-hot-toast";
import { useLayoutDraftGuard } from "@/components/layouts/LayoutDraftContext";

/* =========================================================================
   DYNAMIC ICON
   ========================================================================= */

function DynamicIcon({ icon, library, className = "h-4 w-4" }) {
  const fallback = <Settings2 className={className} />;

  if (!icon || !library) {
    return fallback;
  }

  return (
    <Icon
      name={icon}
      library={library}
      className={className}
      fallback={fallback}
    />
  );
}

/* =========================================================================
   TOGGLE
   ========================================================================= */

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onChange?.();
      }}
      className={`
                relative
                h-6
                w-11
                shrink-0
                rounded-full
                transition-colors
                ${checked ? "bg-primary" : "bg-muted"}
                disabled:cursor-not-allowed
                disabled:opacity-50
            `}
      aria-pressed={checked}
    >
      <span
        className={`
                    absolute
                    top-1
                    h-4
                    w-4
                    rounded-full
                    bg-primary-foreground
                    shadow-sm
                    transition-transform
                    ${checked ? "left-6" : "left-1"}
                `}
      />
    </button>
  );
}

/* =========================================================================
   SORTABLE GROUP
   ========================================================================= */

function SortableGroup({
  group,
  selected,
  expanded,
  disabled,
  onSelect,
  onToggleExpanded,
  onToggle,
  children,
  onAddField,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `group-${group.id}`,

    data: {
      type: "group",
      groupId: group.id,
      acceptsItems: group.data.length === 0,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),

    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
                overflow-hidden
                rounded-xl
                border
                transition-all

                ${selected
          ? "border-primary/40 bg-primary/[0.03] shadow-sm"
          : "border-border bg-card"
        }

                ${isDragging ? "opacity-50" : ""}
            `}
    >
      {/* GROUP HEADER */}

      <div
        onClick={() => {
          onSelect(group);
          onToggleExpanded(group);
        }}
        className={`layout-tree-row
                    flex
                    cursor-pointer
                    items-center
                    gap-2
                    px-3
                    py-2.5
                    transition-colors

                    ${selected ? "bg-primary/[0.05]" : "hover:bg-accent/50"}
                `}
      >
        {/* DRAG HANDLE */}

        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(event) => event.stopPropagation()}
          className="
                        flex
                        h-7
                        w-6
                        shrink-0
                        touch-none cursor-grab
                        items-center
                        justify-center
                        rounded-md
                        text-muted-foreground/50
                        hover:bg-accent
                        hover:text-foreground
                        active:cursor-grabbing
                    "
          title="Drag group"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* ICON */}

        <div
          className="
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-border
                        bg-background
                    "
        >
          <Settings2 className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* NAME */}

        <div
          className={`min-w-0 flex-1 ${group.is_visible ? "" : "opacity-45"}`}
        >
          <p className="truncate text-sm font-semibold text-foreground">
            {group.group_name}
          </p>

          <p className="text-[11px] text-muted-foreground">
            {group.is_visible
              ? `${group.data.length} ${group.data.length === 1 ? "module" : "modules"}`
              : "Hidden from sidebar"}
          </p>
        </div>

        {/* ACTIVE */}

        <Toggle
          checked={group.is_visible}
          onChange={() => onToggle(group)}
          disabled={disabled}
        />

        <button
          type="button"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${group.group_name}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpanded(group);
          }}
          className="
                        flex
                        h-7
                        w-7
                        shrink-0
                        items-center
                        justify-center
                        rounded-md
                        text-muted-foreground
                        hover:bg-accent
                        hover:text-foreground
                    "
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              expanded ? "rotate-0" : "-rotate-90"
            }`}
          />
        </button>
      </div>

      {/* FIELDS */}

      {expanded && (
        <div
          className="
                    border-t
                    border-border
                    px-2
                    py-1.5
                "
        >
          {children}

          {group.data.length === 0 && (
            <div className="mx-1 my-2 rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] px-3 py-4 text-center text-xs text-muted-foreground">
              Drop a module here
            </div>
          )}

          <button
            type="button"
            onClick={() => onAddField(group)}
            disabled={group.isNew}
            title={group.isNew ? "Create the group before adding modules" : undefined}
            className="
                        mt-1
                        flex
                        w-full
                        items-center
                        gap-2
                        rounded-lg
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-muted-foreground
                        transition-colors
                        hover:bg-accent
                        hover:text-foreground
                        disabled:pointer-events-none
                        disabled:opacity-40
                    "
          >
            <Plus className="h-3.5 w-3.5" />
            Add module
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   SORTABLE FIELD
   ========================================================================= */

function SortableField({
  item,
  groupId,
  selected,
  onSelect,
  onToggle,
  disabled,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `item-${item.id}`,

    data: {
      type: "item",
      itemId: item.id,
      groupId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),

    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(item)}
      className={`layout-tree-row
                group
                flex
                cursor-pointer
                items-center
                gap-2
                rounded-lg
                px-2
                py-2
                transition-colors

                ${selected ? "bg-primary/10" : "hover:bg-accent/60"}

                ${isDragging ? "opacity-50" : ""}
            `}
    >
      {/* DRAG */}

      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(event) => event.stopPropagation()}
        className="
                    flex
                    h-7
                    w-5
                    shrink-0
                    touch-none cursor-grab
                    items-center
                    justify-center
                    rounded-md
                    text-muted-foreground/40
                    hover:bg-accent
                    hover:text-foreground
                    active:cursor-grabbing
                "
        title="Drag module"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* ICON */}

      <div
        className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-md
                    border
                    border-border
                    bg-background
                "
      >
        <DynamicIcon
          icon={item.icon}
          library={item.library}
          className="
                        h-3.5
                        w-3.5
                        text-muted-foreground
                    "
        />
      </div>

      {/* NAME */}

      <div className={`min-w-0 flex-1 ${item.is_visible ? "" : "opacity-45"}`}>
        <p className="truncate text-xs font-medium text-foreground">
          {item.name}
        </p>

        {!item.is_visible && (
          <p className="text-[10px] text-muted-foreground">
            Hidden from sidebar
          </p>
        )}
      </div>

      {/* ACTIVE */}

      <Toggle
        checked={item.is_visible}
        onChange={() => onToggle(item)}
        disabled={disabled}
      />
    </div>
  );
}

/* =========================================================================
   INPUT
   ========================================================================= */

function FieldInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-foreground">
        {label}
      </label>

      <input
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="
                    h-10
                    w-full
                    rounded-lg
                    border
                    border-border
                    bg-background
                    px-3
                    text-sm
                    text-foreground
                    outline-none
                    placeholder:text-muted-foreground
                    focus:border-primary/50
                    focus:ring-2
                    focus:ring-primary/10
                "
      />
    </div>
  );
}

function ModuleSelect({
  value,
  onChange,
  modules,
  loading,
  loadError,
  disabled,
}) {
  const currentValueIsCustom =
    value && !modules.some((module) => module.value === value);

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-foreground">
        Module Name
      </label>

      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || loading || loadError}
          className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="" disabled>
            {loading ? "Loading CRM modules..." : "Select a CRM module"}
          </option>

          {currentValueIsCustom && (
            <option value={value}>{value} (configured value)</option>
          )}

          {modules.map((module) => (
            <option key={module.value} value={module.value}>
              {module.label} ({module.value})
            </option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      <p
        className={`mt-1.5 text-[10px] ${
          loadError ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {loadError
          ? "CRM modules could not be loaded. Refresh and try again."
          : "The selected CRM module key is saved as fetch_from."}
      </p>
    </div>
  );
}

/* =========================================================================
   GROUP EDITOR
   ========================================================================= */

function GroupEditor({
  group,
  onUpdate,
  onDelete,
  onAddField,
  onSave,
  saving,
}) {
  if (!group) {
    return <EmptyEditor />;
  }

  /**
   * A draft has nothing stored yet, so it is discarded rather
   * than deleted. A stored group can only be deleted once it
   * holds no modules, which keeps module records from being
   * orphaned.
   */
  const isDraft = Boolean(group.isNew) || !isPersistableId(group.id);

  const moduleCount = group.data?.length ?? 0;

  const blockedByModules = !isDraft && moduleCount > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-20 flex h-[68px] shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Group
          </p>

          <h3 className="mt-0.5 truncate text-base font-semibold">
            Group Settings
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onDelete(group)}
            disabled={saving || blockedByModules}
            title={
              blockedByModules
                ? `Remove all ${moduleCount} ${moduleCount === 1 ? "module" : "modules"} from this group before deleting it`
                : undefined
            }
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-destructive/25 px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDraft ? "Discard" : "Delete"}
          </button>

          {isDraft && (
            <button
              type="button"
              onClick={() => onSave(group)}
              disabled={saving || !group.group_name?.trim()}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Create
            </button>
          )}
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
        <div className="space-y-5">
          <FieldInput
            label="Group Name"
            value={group.group_name}
            onChange={(value) =>
              onUpdate({
                group_name: value,
              })
            }
            placeholder="Enter group name"
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Modules</p>

                <p className="text-xs text-muted-foreground">
                  {group.data.length} modules
                </p>
              </div>

              <button
                type="button"
                onClick={() => onAddField(group)}
                disabled={group.isNew}
                title={
                  group.isNew
                    ? "Create the group before adding modules"
                    : undefined
                }
                className="
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    rounded-lg
                                    border
                                    border-border
                                    px-2.5
                                    py-1.5
                                    text-xs
                                    font-medium
                                    hover:bg-accent
                                    disabled:pointer-events-none
                                    disabled:opacity-40
                                "
              >
                <Plus className="h-3.5 w-3.5" />
                Add module
              </button>
            </div>

            <div className="space-y-1.5">
              {group.data.map((item) => (
                <div
                  key={item.id}
                  className="
                                            flex
                                            items-center
                                            gap-2
                                            rounded-lg
                                            border
                                            border-border
                                            bg-background
                                            px-3
                                            py-2
                                        "
                >
                  <DynamicIcon
                    icon={item.icon}
                    library={item.library}
                    className="
                                                h-4
                                                w-4
                                                text-muted-foreground
                                            "
                  />

                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {item.name}
                  </span>

                </div>
              ))}
            </div>

            {blockedByModules && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                A group has to be empty before it can be deleted. Drag
                its modules into another group first.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   FIELD EDITOR
   ========================================================================= */

function ItemEditor({
  item,
  onUpdate,
  onDelete,
  onSave,
  saving,
  crmModules,
  modulesLoading,
  modulesLoadError,
}) {
  if (!item) {
    return <EmptyEditor />;
  }

  const isDraft = Boolean(item.isNew) || !isPersistableId(item.id);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-20 flex h-[68px] shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-primary">
            Module{item.name ? ` · ${item.name}` : ""}
          </p>

          <h3 className="mt-0.5 truncate text-base font-semibold">
            Module Settings
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onDelete(item)}
            disabled={saving}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-destructive/25 px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDraft ? "Discard" : "Delete"}
          </button>

          {isDraft && (
            <button
              type="button"
              onClick={() => onSave(item)}
              disabled={
                saving || !item.name?.trim() || !item.module_name?.trim()
              }
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Create
            </button>
          )}
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
        <div className="space-y-5">
          <FieldInput
            label="Label"
            value={item.name}
            onChange={(value) =>
              onUpdate({
                name: value,
              })
            }
            placeholder="Contacts"
          />

          <ModuleSelect
            value={item.module_name}
            onChange={(value) =>
              onUpdate({
                module_name: value,
              })
            }
            modules={crmModules}
            loading={modulesLoading}
            loadError={modulesLoadError}
            disabled={saving}
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Icon
            </label>

            <IconInput
              value={
                item.icon && item.library
                  ? {
                      name: item.icon,
                      library: item.library,
                    }
                  : null
              }
              onChange={(selection) =>
                onUpdate({
                  icon: selection?.name ?? "",
                  library: selection?.library ?? "",
                })
              }
              placeholder="Choose an icon"
              disabled={saving}
            />

            <p className="mt-1.5 text-[10px] text-muted-foreground">
              The icon and library are published when you repair the sidebar.
            </p>
          </div>

          <FieldInput
            label="Navigation"
            value={item.navigation}
            onChange={(value) =>
              onUpdate({
                navigation: value,
              })
            }
            placeholder="/contacts"
          />

        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   EMPTY EDITOR
   ========================================================================= */

function EmptyEditor() {
  return (
    <div
      className="
                flex
                h-full
                min-h-[400px]
                flex-col
                items-center
                justify-center
                px-8
                text-center
            "
    >
      <div
        className="
                    mb-4
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-border
                    bg-muted/20
                "
      >
        <Settings2 className="h-5 w-5 text-muted-foreground" />
      </div>

      <h3 className="text-sm font-semibold">Nothing selected</h3>

      <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
        Select a group or sidebar module from the left to configure its
        properties.
      </p>
    </div>
  );
}

/* =========================================================================
   TYPE-AWARE COLLISION DETECTION
   ========================================================================= */

const collisionDetectionStrategy = (args) => {
  const activeType = args.active?.data?.current?.type;

  if (activeType === "group") {
    const groupContainers = args.droppableContainers.filter(
      (container) => container.data?.current?.type === "group",
    );

    return closestCenter({
      ...args,
      droppableContainers: groupContainers,
    });
  }

  if (activeType === "item") {
    const moduleContainers = args.droppableContainers.filter(
      (container) =>
        container.data?.current?.type === "item" ||
        (container.data?.current?.type === "group" &&
          container.data?.current?.acceptsItems),
    );

    return closestCenter({
      ...args,
      droppableContainers: moduleContainers,
    });
  }

  return closestCenter(args);
};

/* =========================================================================
   SIDEBAR PAGE
   ========================================================================= */

const Sidebar = () => {
  const { data: layoutData, isPending: layoutLoading } = useLayoutPreferences();

  const {
    data: crmModules = [],
    isPending: crmModulesLoading,
    isError: crmModulesLoadError,
  } = useCrmModules();

  const { mutateAsync: saveLayoutRecord, isPending: updateLayoutPending } =
    useUpdateLayout();

  const [groups, setGroups] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);

  const [search, setSearch] = useState("");

  const [expandedGroups, setExpandedGroups] = useState({});

  const [activeDrag, setActiveDrag] = useState(null);

  const [savingRecord, setSavingRecord] = useState(false);

  const [dirty, setDirty] = useState(false);

  const baselineGroups = useRef([]);

  const responseModule = (kind) => {
    try {
      const moduleName = resolveSidebarModules(baselineGroups.current)[kind];
      if (!moduleName) {
        throw new Error(`The sidebar response did not provide a ${kind === "groupModule" ? "group" : "item"} module name.`);
      }
      return moduleName;
    } catch (error) {
      toast.error(error.message);
      return null;
    }
  };

  useLayoutDraftGuard("layout-sidebar", dirty);

  const savingLayout = savingRecord || updateLayoutPending;

  /**
   * Held true for the whole of a reorder. Starting a second
   * drag before the first has landed would derive neighbour IDs
   * from an order the server has not accepted yet.
   */
  const [savingOrder, setSavingOrder] = useState(false);

  /**
   * A missing or duplicated rank means the data cannot be
   * ordered at all. It is shown, not worked around.
   */
  const [rankError, setRankError] = useState(null);

  const queryClient = useQueryClient();

  /**
   * Writes still in flight, so the sync effect does not
   * overwrite optimistic state mid-request. An intra-group
   * reorder is one write; a cross-group move also changes the
   * group/module relationship. Toggles add their own writes.
   */
  const pendingWrites = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  /* =====================================================================
       API DATA -> LOCAL STATE
       ===================================================================== */

  /**
   * Put a server payload on screen.
   *
   * This runs after every reorder, so it must not disturb
   * anything the user was doing. The selected record and the
   * expanded groups are preserved; only groups the editor has
   * not seen before get expanded by default, and the selection
   * is only replaced when the record it pointed at is gone.
   *
   * Any scope with a missing or duplicate rank is reported
   * rather than guessed at. Those records still render, in the
   * order the server sent, but reordering stays blocked until
   * the data is repaired.
   */
  const applyServerLayout = useCallback((payload) => {
    const rankProblems = [];

    const normalized = normalizeSidebarResponse(payload, {
      onInvalid: (report) => rankProblems.push(report),
    });

    baselineGroups.current = normalized;
    setGroups(normalized);
    setDirty(false);

    setRankError(
      rankProblems.length
        ? {
          reports: rankProblems,
          message: `Sidebar ordering data is invalid in ${rankProblems.length} place(s). Reordering is disabled until it is fixed.`,
        }
        : null,
    );

    if (!normalized.length) {
      return normalized;
    }

    /* Default new groups to expanded, leave the rest alone. */
    setExpandedGroups((current) => {
      const next = { ...current };

      normalized.forEach((group) => {
        if (next[group.id] === undefined) {
          next[group.id] = true;
        }
      });

      return next;
    });

    setSelectedItem((current) => {
      if (current) {
        const stillThere =
          current.type === "group"
            ? normalized.some((group) => group.id === current.id)
            : normalized.some((group) =>
              (group.data ?? []).some((item) => item.id === current.id),
            );

        if (stillThere) {
          return current;
        }
      }

      return { type: "group", id: normalized[0].id };
    });

    return normalized;
  }, []);

  useEffect(() => {
    if (!layoutData) {
      return;
    }

    /**
     * A write is in flight, so local state is showing the
     * optimistic order and this payload predates it.
     */
    if (pendingWrites.current > 0 || dirty) {
      return;
    }

    applyServerLayout(layoutData);
  }, [layoutData, applyServerLayout, dirty]);

  /* =====================================================================
       FILTER
       ===================================================================== */

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return groups;
    }

    return groups
      .map((group) => {
        const groupMatch = group.group_name?.toLowerCase().includes(query);

        const fields = group.data.filter(
          (item) =>
            groupMatch ||
            item.name?.toLowerCase().includes(query) ||
            item.module_name?.toLowerCase().includes(query),
        );

        return {
          ...group,

          data: groupMatch ? group.data : fields,
        };
      })
      .filter(
        (group) =>
          group.group_name?.toLowerCase().includes(query) ||
          group.data.length > 0,
      );
  }, [groups, search]);

  /* =====================================================================
       SELECTED OBJECT
       ===================================================================== */

  const selectedObject = useMemo(() => {
    if (!selectedItem) {
      return null;
    }

    if (selectedItem.type === "group") {
      return groups.find((group) => group.id === selectedItem.id) || null;
    }

    for (const group of groups) {
      const item = group.data.find((item) => item.id === selectedItem.id);

      if (item) {
        return item;
      }
    }

    return null;
  }, [groups, selectedItem]);

  /* =====================================================================
       SELECT
       ===================================================================== */

  const selectGroup = (group) => {
    setSelectedItem({
      type: "group",
      id: group.id,
    });
  };

  const selectField = (item) => {
    setSelectedItem({
      type: "field",
      id: item.id,
    });
  };

  /** Read and display the authoritative sidebar after Repair or Discard. */
  const reloadSidebar = async () => {
    pendingWrites.current = 0;
    const fresh = await fetchLayout();
    queryClient.setQueryData(preferenceKeys.layout(), fresh);

    return applyServerLayout(fresh);
  };

  /* =====================================================================
       TOGGLE GROUP
       ===================================================================== */

  /**
   * Turning a group off hides the whole group, heading and
   * modules, from the live sidebar. The modules keep their
   * own is_visible, so turning the group back on restores
   * whatever was visible before.
   *
   * `active` is optional: omit it to flip the current
   * value, pass it to set an explicit state.
   */
  const setGroupVisible = (group, visible) => {
    if (!group?.id) {
      return;
    }

    const nextVisible = visible === undefined ? !group.is_visible : Boolean(visible);

    if (nextVisible === group.is_visible) {
      return;
    }

    setGroups((current) =>
      current.map((item) =>
        item.id === group.id
          ? {
            ...item,
            is_visible: nextVisible,
          }
          : item,
      ),
    );
    setDirty(true);
  };

  const toggleGroup = (group) => setGroupVisible(group);

  /* =====================================================================
       TOGGLE FIELD
       ===================================================================== */

  const setFieldVisible = (item, visible) => {
    if (!item?.id) {
      return;
    }

    const nextVisible = visible === undefined ? !item.is_visible : Boolean(visible);

    if (nextVisible === item.is_visible) {
      return;
    }

    setGroups((current) =>
      current.map((group) => ({
        ...group,

        data: group.data.map((field) =>
          field.id === item.id
            ? {
              ...field,
              is_visible: nextVisible,
            }
            : field,
        ),
      })),
    );
    setDirty(true);
  };

  const toggleField = (item) => setFieldVisible(item);

  /* =====================================================================
       UPDATE GROUP LOCAL
       ===================================================================== */

  const updateGroup = (groupId, changes) => {
    setDirty(true);
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
            ...group,
            ...changes,
          }
          : group,
      ),
    );
  };

  /* =====================================================================
       UPDATE FIELD LOCAL
       ===================================================================== */

  const updateField = (itemId, changes) => {
    setDirty(true);
    setGroups((current) =>
      current.map((group) => ({
        ...group,

        data: group.data.map((item) =>
          item.id === itemId
            ? {
              ...item,
              ...changes,
            }
            : item,
        ),
      })),
    );
  };

  /* =====================================================================
       CREATE / UPDATE DRAFTS
       ===================================================================== */

  const saveGroup = async (group) => {
    const name = group?.group_name?.trim();

    if (!name) {
      toast.error("Enter a group name before saving.");
      return;
    }

    setDirty(true);
    toast.success("Group change staged. Click Repair to publish it.");
  };

  const saveField = async (item) => {
    const parentGroup = groups.find((group) =>
      group.data.some((field) => field.id === item?.id),
    );

    if (!item?.name?.trim()) {
      toast.error("Enter a module label before saving.");
      return;
    }

    if (!item?.module_name?.trim()) {
      toast.error("Select a CRM module before saving.");
      return;
    }

    if (!parentGroup) {
      toast.error("The module must belong to a group.");
      return;
    }

    setDirty(true);
    toast.success("Module change staged. Click Repair to publish it.");
  };

  /* =====================================================================
       DELETE OR DISCARD GROUP
       ===================================================================== */

  /**
   * Two different operations behind one button.
   *
   * An unsaved draft has no server row, so it is simply
   * dropped from local state.
   *
   * A persisted group is deleted on the server, and only when
   * it holds no modules. Deleting a group that still owns
   * modules would leave those rows pointing at a group that no
   * longer exists, so the modules have to be moved out or
   * deleted first. `group.data` counts every module record,
   * including the ones toggled off.
   */
  const deleteGroup = async (group) => {
    if (!group?.id) {
      return;
    }

    if (savingRecord || savingOrder) {
      return;
    }

    const moduleCount = group.data?.length ?? 0;

    if (moduleCount > 0) {
      toast.error(
        `Remove the ${moduleCount} ${moduleCount === 1 ? "module" : "modules"} inside "${group.group_name}" before deleting the group.`,
      );

      return;
    }

    const confirmed =
      !isPersistableId(group.id) ||
      window.confirm(
        `Stage "${group.group_name}" for deletion? It will be removed when you click Repair.`,
      );

    if (!confirmed) {
      return;
    }

    setGroups((current) => current.filter((item) => item.id !== group.id));
    setSelectedItem(null);
    setExpandedGroups((current) => {
      const next = { ...current };
      delete next[group.id];
      return next;
    });
    setDirty(true);
  };

  /* =====================================================================
       DELETE / DISCARD FIELD
       ===================================================================== */

  const deleteField = async (item) => {
    if (!item?.id) {
      return;
    }

    if (savingRecord || savingOrder) {
      return;
    }

    const confirmed =
      !isPersistableId(item.id) ||
      window.confirm(
        `Stage "${item.name || "Module"}" for deletion? It will be removed when you click Repair.`,
      );

    if (!confirmed) {
      return;
    }

    setGroups((current) =>
      current.map((group) => ({
        ...group,
        data: group.data.filter((field) => field.id !== item.id),
      })),
    );
    setSelectedItem(null);
    setDirty(true);
  };

  /* =====================================================================
       ADD GROUP - LOCAL ONLY
       ===================================================================== */

  const addGroup = (name) => {
    const groupModule = responseModule("groupModule");
    if (!groupModule) return;
    const id = `local-group-${Date.now()}`;

    /**
     * Appended records get no rank. `rank_key` is left out of
     * the create payload and the backend assigns the next rank
     * in the scope; the saved record is then refetched to pick
     * it up. Guessing one here is how duplicates happen.
     */
    const group = {
      id,

      group_name: name,

      [RANK_FIELD]: null,

      is_visible: true,

      module: groupModule,

      data: [],

      isNew: true,
    };

    setGroups((current) => [...current, group]);

    setSelectedItem({
      type: "group",
      id,
    });

    setExpandedGroups((current) => ({
      ...current,
      [id]: true,
    }));
    setDirty(true);
  };

  /* =====================================================================
       ADD FIELD - LOCAL ONLY
       ===================================================================== */

  const addField = ({ groupId, name, icon }) => {
    const itemModule = responseModule("itemModule");
    if (!itemModule) return;
    setGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        const id = `local-item-${Date.now()}`;

        /*
         * Appended, so no rank is sent. The backend assigns the
         * next rank inside this group_name scope.
         */
        const newItem = {
          id,

          name,

          module: itemModule,

          module_name: "",

          library: "lu",

          icon: icon || "LuSettings2",

          key: "",

          data_filters: [],

          count_filters: [],

          count_email_req: 0,

          navigation: "",

          endpoint: "",

          [RANK_FIELD]: null,

          description: "",

          is_visible: true,

          isNew: true,
        };

        setTimeout(() => {
          setSelectedItem({
            type: "field",
            id,
          });
        }, 0);

        return {
          ...group,

          data: [...group.data, newItem],
        };
      }),
    );

    setExpandedGroups((current) => ({
      ...current,
      [groupId]: true,
    }));
    setDirty(true);
  };

  /* =====================================================================
       DRAG START
       ===================================================================== */

  const handleDragStart = ({ active }) => {
    setActiveDrag(active.data.current);
  };

  /* =====================================================================
       MOVE A GROUP
       ===================================================================== */

  /**
   * Scope: the global group list.
   *
   * One update on the moved group, carrying the IDs of the
   * groups now either side of it.
   */
  const moveGroup = (movedId, destinationIndex, sourceGroups) => {
    const reordered = reorderCopy(sourceGroups, movedId, destinationIndex);

    setGroups(reordered);
    setDirty(true);

    return reordered;
  };

  /* =====================================================================
       MOVE A FIELD
       ===================================================================== */

  /** Stage a module reorder or cross-group move until Repair. */
  const moveField = ({
    movedId,
    sourceGroupId,
    targetGroupId,
    destinationIndex,
    sourceGroups,
  }) => {
    const crossScope = String(sourceGroupId) !== String(targetGroupId);

    const sourceGroup = sourceGroups.find(
      (group) => String(group.id) === String(sourceGroupId),
    );

    const targetGroup = sourceGroups.find(
      (group) => String(group.id) === String(targetGroupId),
    );

    if (!sourceGroup || !targetGroup) {
      return Promise.resolve(null);
    }

    const moved = (sourceGroup.data ?? []).find(
      (item) => String(item.id) === String(movedId),
    );

    if (!moved) {
      return Promise.resolve(null);
    }

    let targetFields;
    let sourceFields = null;

    if (crossScope) {
      sourceFields = (sourceGroup.data ?? []).filter(
        (item) => String(item.id) !== String(movedId),
      );

      targetFields = [...(targetGroup.data ?? [])];

      targetFields.splice(
        Math.max(0, Math.min(destinationIndex, targetFields.length)),
        0,
        moved,
      );
    } else {
      targetFields = reorderCopy(
        targetGroup.data ?? [],
        movedId,
        destinationIndex,
      );
    }

    /* Optimistic. */
    setGroups((current) =>
      current.map((group) => {
        if (String(group.id) === String(targetGroupId)) {
          return { ...group, data: targetFields };
        }

        if (sourceFields && String(group.id) === String(sourceGroupId)) {
          return { ...group, data: sourceFields };
        }

        return group;
      }),
    );

    setDirty(true);

    return targetFields;
  };

  /* =====================================================================
       DRAG END
       ===================================================================== */

  const handleDragEnd = ({ active, over }) => {
    setActiveDrag(null);

    if (!over) return;

    /*
     * A move can be in flight, and the rank data can be
     * invalid. Either way the neighbour IDs a new move would be
     * derived from cannot be trusted.
     */
    if (savingOrder || rankError) return;

    const activeData = active.data?.current;
    const overData = over.data?.current;

    if (!activeData || !overData) return;

    /* ================================================================
           GROUP REORDER - scope: the global group list
           ================================================================ */

    if (activeData.type === "group") {
      if (overData.type !== "group") return;

      const activeGroupId = activeData.groupId;
      const overGroupId = overData.groupId;

      if (!activeGroupId || !overGroupId) return;
      if (String(activeGroupId) === String(overGroupId)) return;

      const oldIndex = groups.findIndex(
        (group) => String(group.id) === String(activeGroupId),
      );

      const newIndex = groups.findIndex(
        (group) => String(group.id) === String(overGroupId),
      );

      if (oldIndex === -1 || newIndex === -1) return;
      if (oldIndex === newIndex) return;

      moveGroup(activeGroupId, newIndex, groups);
      return;
    }

    /* ================================================================
           FIELD REORDER - scope: modules of one group_name
           ================================================================ */

    if (activeData.type === "item") {
      const droppingIntoEmptyGroup =
        overData.type === "group" && overData.acceptsItems;

      if (overData.type !== "item" && !droppingIntoEmptyGroup) return;

      const activeItemId = activeData.itemId;
      const overItemId = droppingIntoEmptyGroup ? null : overData.itemId;

      if (!activeItemId) return;
      if (overItemId && String(activeItemId) === String(overItemId)) return;

      const sourceGroup = groups.find((group) =>
        group.data?.some((item) => String(item.id) === String(activeItemId)),
      );

      const targetGroup = droppingIntoEmptyGroup
        ? groups.find(
            (group) => String(group.id) === String(overData.groupId),
          )
        : groups.find((group) =>
            group.data?.some(
              (item) => String(item.id) === String(overItemId),
            ),
          );

      if (!sourceGroup || !targetGroup) return;

      const oldIndex = sourceGroup.data.findIndex(
        (item) => String(item.id) === String(activeItemId),
      );

      /*
       * Destination index inside the TARGET group. For a
       * cross-group move this is where the record is inserted;
       * neighbours are only ever read from this scope.
       */
      const newIndex = droppingIntoEmptyGroup
        ? 0
        : targetGroup.data.findIndex(
            (item) => String(item.id) === String(overItemId),
          );

      if (oldIndex === -1 || newIndex === -1) return;

      moveField({
        movedId: activeItemId,
        sourceGroupId: sourceGroup.id,
        targetGroupId: targetGroup.id,
        destinationIndex: newIndex,
        sourceGroups: groups,
      });
    }
  };

  /* =====================================================================
       REPAIR DRAFT
       ===================================================================== */

  const repairChanges = async () => {
    if (!dirty || savingLayout || savingOrder) {
      return;
    }

    const original = baselineGroups.current;
    let groupModule;
    let itemModule;
    try {
      ({ groupModule, itemModule } = resolveSidebarModules(original));
    } catch (error) {
      toast.error(error.message);
      return;
    }
    const hasItems = groups.some((group) => (group.data ?? []).length > 0);
    if (!groupModule || (hasItems && !itemModule)) {
      toast.error("The sidebar response must provide the module names needed for Repair.");
      return;
    }
    const profileSidebar = isSidebarProfilePair(groupModule, itemModule);
    const profileId = layoutData?.profile?.id;
    if (profileSidebar && !profileId) {
      toast.error("The sidebar response did not include a profile id. Reload before Repair.");
      return;
    }
    if (profileSidebar && groups.some((group) =>
      !isPersistableId(group.id) && (group.data ?? []).some((item) =>
        isPersistableId(item.id) && baselineGroups.current.some((originalGroup) =>
          (originalGroup.data ?? []).some((originalItem) => originalItem.id === item.id),
        ),
      ),
    )) {
      toast.error("Publish the new profile group before moving existing modules into it.");
      return;
    }
    const groupLinkField = `${groupModule}_${itemModule}_1${groupModule}_ida`;
    const componentModule = "outr_global_component";
    const componentLinkField = `${componentModule}_${itemModule}_1${componentModule}_ida`;
    let desired = groups.map((group) => ({
      ...group,
      data: (group.data ?? []).map((item) => ({ ...item })),
    }));
    const resolvedIds = new Map();

    const resolveId = (id) => resolvedIds.get(String(id)) || id;
    const originalGroups = new Map(
      original.map((group) => [String(group.id), group]),
    );
    const originalModules = new Map();
    const originalModuleParents = new Map();

    original.forEach((group) => {
      (group.data ?? []).forEach((item) => {
        originalModules.set(String(item.id), item);
        originalModuleParents.set(String(item.id), group.id);
      });
    });

    const desiredModuleIds = new Set(
      desired.flatMap((group) =>
        (group.data ?? []).map((item) => String(item.id)),
      ),
    );
    const desiredGroupIds = new Set(desired.map((group) => String(group.id)));

    const groupPayload = (group) => ({
      name: group.group_name?.trim() || "",
      is_visible: toVisibilityFlag(group.is_visible),
    });
    const modulePayload = (item, parentGroup, sidebarComponentId = null, isCreate = false) => ({
      name: item.name?.trim() || "",
      fetch_from: item.module_name ?? "",
      icon_name: item.icon ?? "",
      library: item.library ?? "",
      navigation: item.navigation ?? "",
      is_visible: toVisibilityFlag(item.is_visible),
      ...(!profileSidebar ? {
        group_name: parentGroup.group_name,
        [groupLinkField]: resolveId(parentGroup.id),
      } : {}),
      ...(profileSidebar && isCreate ? { ui_group_id: parentGroup.ui_group_id } : {}),
      ...(sidebarComponentId ? { [componentLinkField]: sidebarComponentId } : {}),
    });
    const changed = (left, right, keys) =>
      keys.some(
        (key) => JSON.stringify(left?.[key]) !== JSON.stringify(right?.[key]),
      );

    const persistOrder = async ({
      currentItems,
      desiredIds,
      module,
      scopeFields = {},
    }) => {
      let working = [...currentItems];

      for (let index = 0; index < desiredIds.length; index += 1) {
        const movedId = String(desiredIds[index]);
        const currentIndex = working.findIndex(
          (item) => String(item.id) === movedId,
        );

        if (currentIndex < 0 || currentIndex === index) {
          continue;
        }

        const reordered = reorderCopy(working, movedId, index);
        const { previousId, nextId } = resolveMoveNeighborIds(
          reordered,
          movedId,
        );

        await requestRankMove({
          module,
          id: movedId,
          previousId,
          nextId,
          scopeFields,
        });

        working = reordered;
      }
    };

    let profileWriteSucceeded = false;
    const persistProfileOrder = async ({ currentItems, desiredIds }) => {
      const currentOrder = currentItems.map((item) => String(item.id));
      const nextOrder = desiredIds.map(String);
      if (currentOrder.length === nextOrder.length &&
          currentOrder.every((id, index) => id === nextOrder[index])) return;
      if (currentOrder.length !== nextOrder.length ||
          nextOrder.some((id) => !currentOrder.includes(id))) {
        throw new Error("The profile group changed while saving its order. Reload and try again.");
      }

      // Fresh ranks above the occupied range avoid collisions throughout the rebalance.
      const ranks = rebalanceAbove(currentItems.map((item) => item.rank), nextOrder.length);
      for (let index = 0; index < nextOrder.length; index += 1) {
        await saveLayoutRecord({
          action: "update",
          module: itemModule,
          id: nextOrder[index],
          payload: { rank_key: ranks[index] },
        });
        profileWriteSucceeded = true;
      }
    };

    setSavingRecord(true);
    setSavingOrder(true);
    pendingWrites.current += 1;

    try {
      for (const group of desired.filter((item) => !isPersistableId(item.id))) {
        const response = await saveLayoutRecord({
          action: "create",
          module: groupModule,
          payload: groupPayload(group),
        });

        resolvedIds.set(String(group.id), response.id);
      }

      desired = desired.map((group) => ({
        ...group,
        id: resolveId(group.id),
      }));

      for (const group of desired) {
        const serverGroup = originalGroups.get(String(group.id));

        if (
          serverGroup &&
          changed(serverGroup, group, ["group_name", "is_visible"])
        ) {
          await saveLayoutRecord({
            action: "update",
            module: groupModule,
            id: group.id,
            payload: groupPayload(group),
          });
        }
      }

      const hasNewModules = desired.some((group) =>
        (group.data ?? []).some((item) => !isPersistableId(item.id)),
      );
      const sidebarComponentId = hasNewModules && !profileSidebar
        ? await fetchSidebarComponentId()
        : null;

      for (const group of desired) {
        for (const item of group.data ?? []) {
          if (isPersistableId(item.id)) {
            continue;
          }
          if (profileSidebar && !group.ui_group_id) {
            throw new Error(`"${group.group_name}" has no underlying ui_group_id. Publish the group first.`);
          }

          const response = await saveLayoutRecord({
            action: "create",
            module: itemModule,
            payload: modulePayload(item, group, sidebarComponentId, true),
          });

          resolvedIds.set(String(item.id), response.id);
        }
      }

      desired = desired.map((group) => ({
        ...group,
        data: (group.data ?? []).map((item) => ({
          ...item,
          id: resolveId(item.id),
        })),
      }));

      setGroups(desired);
      setSelectedItem((current) =>
        current ? { ...current, id: resolveId(current.id) } : current,
      );

      for (const group of desired) {
        for (const item of group.data ?? []) {
          const serverItem = originalModules.get(String(item.id));
          const oldParentId = originalModuleParents.get(String(item.id));
          const oldParent = originalGroups.get(String(oldParentId));
          const parentNameChanged =
            !profileSidebar && oldParent && oldParent.group_name !== group.group_name;

          if (
            serverItem &&
            (parentNameChanged ||
              changed(serverItem, item, [
                "name",
                "module_name",
                "icon",
                "library",
                "navigation",
                "is_visible",
              ]))
          ) {
            await saveLayoutRecord({
              action: "update",
              module: itemModule,
              id: item.id,
              payload: modulePayload(item, group),
            });
            if (profileSidebar) profileWriteSucceeded = true;
          }

          if (
            oldParentId &&
            String(oldParentId) !== String(group.id)
          ) {
            if (profileSidebar) {
              const beforeMove = await fetchLayout();
              const plan = planSidebarProfileMove({
                response: beforeMove,
                expectedProfileId: profileId,
                moduleId: item.id,
                destinationGroupId: group.id,
                destinationUiGroupId: group.ui_group_id,
                desiredIds: (group.data ?? []).map((entry) => entry.id),
              });
              if (!plan.alreadyMoved) {
                await moveSidebarProfileModule(plan);
                profileWriteSucceeded = true;
              }
              const afterMove = await fetchLayout();
              const movedGroup = afterMove?.data?.find((entry) =>
                String(entry.id) === String(group.id) &&
                String(entry.ui_group_id) === String(group.ui_group_id),
              );
              if (String(afterMove?.profile?.id) !== String(profileId) ||
                  !movedGroup?.data?.some((entry) => String(entry.id) === String(item.id))) {
                throw new Error("The server did not return the module in its destination profile group.");
              }
              const movedItems = normalizeSidebarResponse(afterMove)
                .find((entry) => String(entry.id) === String(group.id))?.data ?? [];
              const rankReport = inspectRankScope(movedItems, {
                collection: itemModule,
                ui_group_id: group.ui_group_id,
              });
              if (!rankReport.valid) throw new RankScopeError(rankReport);
              queryClient.setQueryData(preferenceKeys.layout(), afterMove);
            } else {
              await moveSidebarModuleRelationship({
                moduleId: item.id,
                sourceGroupId: oldParentId,
                targetGroupId: group.id,
                groupModule,
                itemModule,
              });
            }
          }
        }
      }

      for (const [id] of originalModules) {
        if (!desiredModuleIds.has(id)) {
          await saveLayoutRecord({
            action: "delete",
            module: itemModule,
            id,
            payload: {},
          });
        }
      }

      for (const [id] of originalGroups) {
        if (!desiredGroupIds.has(id)) {
          await saveLayoutRecord({
            action: "delete",
            module: groupModule,
            id,
            payload: {},
          });
        }
      }

      const freshPayload = await fetchLayout();
      queryClient.setQueryData(preferenceKeys.layout(), freshPayload);
      const freshGroups = normalizeSidebarResponse(freshPayload);

      await persistOrder({
        currentItems: freshGroups,
        desiredIds: desired.map((group) => group.id),
        module: groupModule,
      });

      for (const desiredGroup of desired) {
        const freshGroup = freshGroups.find(
          (group) => String(group.id) === String(desiredGroup.id),
        );

        if (!freshGroup) {
          continue;
        }

        const desiredIds = (desiredGroup.data ?? []).map((item) => item.id);
        if (profileSidebar) {
          await persistProfileOrder({ currentItems: freshGroup.data ?? [], desiredIds });
        } else {
          await persistOrder({
            currentItems: freshGroup.data ?? [],
            desiredIds,
            module: itemModule,
            scopeFields: { group_name: desiredGroup.group_name },
          });
        }
      }

      await reloadSidebar();
      toast.success("Sidebar repaired and published.");
    } catch (error) {
      console.error("[sidebar] repair failed", error);
      if (profileWriteSucceeded) {
        try {
          await reloadSidebar();
        } catch (reloadError) {
          console.error("[sidebar] could not refresh after a partial profile move", reloadError);
        }
      }
      toast.error(error?.message || "Sidebar changes could not be repaired.");
    } finally {
      pendingWrites.current = Math.max(0, pendingWrites.current - 1);
      setSavingOrder(false);
      setSavingRecord(false);
    }
  };

  /* =====================================================================
       RESET
       ===================================================================== */

  const resetChanges = () => {
    if (!layoutData) {
      return;
    }

    applyServerLayout(layoutData);
  };

  /* =====================================================================
       LOADING
       ===================================================================== */

  if (layoutLoading) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading sidebar...</div>
      </div>
    );
  }

  /* =====================================================================
       RENDER
       ===================================================================== */

  return (
    <div className="sidebar-layout-editor flex min-h-0 min-w-0 flex-col overflow-hidden">
      {/* HEADER */}

      <div
        className="layout-editor-header
                    flex
                    shrink-0
                    items-center
                    justify-between
                    border-b
                    border-border
                    px-5
                    py-4
                "
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Sidebar</h2>

            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              Layout
            </span>

            {dirty && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                Unapplied changes
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Changes stay in this editor until you repair the layout.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savingOrder && (
            <span
              role="status"
              className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
            >
              Repairing...
            </span>
          )}

          <button
            type="button"
            onClick={resetChanges}
            disabled={savingLayout || savingOrder || !dirty}
            className="
                            inline-flex
                            items-center
                            gap-2
                            rounded-lg
                            border
                            border-border
                            px-3
                            py-2
                            text-sm
                            font-medium
                            hover:bg-accent
                            disabled:pointer-events-none
                            disabled:opacity-50
                        "
          >
            <RotateCcw className="h-4 w-4" />
            Discard
          </button>

          <button
            type="button"
            onClick={() => addGroup("New Group")}
            disabled={savingLayout}
            className="
                            inline-flex
                            items-center
                            gap-2
                            rounded-lg
                            border
                            border-border
                            px-3
                            py-2
                            text-sm
                            font-medium
                            hover:bg-accent
                            disabled:pointer-events-none
                            disabled:opacity-50
                        "
          >
            <Plus className="h-4 w-4" />
            Add Group
          </button>

          <button
            type="button"
            onClick={repairChanges}
            disabled={!dirty || savingLayout || savingOrder}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {savingLayout || savingOrder ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Wrench className="h-4 w-4" />
            )}
            Repair
          </button>
        </div>
      </div>

      {/* =====================================================================
             INVALID RANK DATA
             ===================================================================== */}

      {rankError && (
        <div
          role="alert"
          className="
                        shrink-0
                        border-b
                        border-destructive/30
                        bg-destructive/10
                        px-5
                        py-3
                    "
        >
          <p className="text-sm font-medium text-destructive">
            {rankError.message}
          </p>

          <ul className="mt-1 space-y-0.5">
            {rankError.reports.map((report) => (
              <li
                key={report.scopeLabel}
                className="text-xs text-destructive/80"
              >
                {report.scopeLabel}
                {report.missing.length
                  ? ` - missing rank on ${report.missing.length} record(s)`
                  : ""}
                {report.duplicates.length
                  ? ` - duplicate rank(s): ${report.duplicates
                    .map((entry) => entry.rank)
                    .join(", ")}`
                  : ""}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={reloadSidebar}
            className="
                            mt-2
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-destructive/30
                            px-2.5
                            py-1.5
                            text-xs
                            font-medium
                            text-destructive
                            hover:bg-destructive/10
                        "
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reload from server
          </button>
        </div>
      )}

      {/* MAIN TWO COLUMN AREA */}

      <div
        className="
                    sidebar-layout-workspace
                    grid
                    min-h-0
                    overflow-hidden
                    layout-editor-grid
                "
      >
        {/* =========================================================
                    LEFT SIDEBAR BUILDER
                   ========================================================= */}

        <div
          className="
                        sidebar-layout-tree-pane
                        flex
                        h-full
                        min-h-0
                        flex-col
                        overflow-hidden
                        border-b
                        border-border
                        bg-card
                    "
        >
          {/* SEARCH */}

          <div className="sticky top-0 z-20 flex h-[68px] shrink-0 items-center border-b border-border bg-card px-3">
            <div className="relative w-full">
              <Search
                className="
                                    pointer-events-none
                                    absolute
                                    left-3
                                    top-1/2
                                    h-4
                                    w-4
                                    -translate-y-1/2
                                    text-muted-foreground
                                "
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search groups or modules..."
                className="
                                    h-10
                                    w-full
                                    rounded-lg
                                    border
                                    border-border
                                    bg-background
                                    pl-9
                                    pr-3
                                    text-sm
                                    outline-none
                                    focus:border-primary/50
                                "
              />
            </div>
          </div>

          {/* BUILDER */}

          <div
            role="region"
            aria-label="Sidebar layout structure"
            tabIndex={0}
            className="sidebar-layout-scroll custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
          >
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetectionStrategy}
              onDragStart={handleDragStart}
              onDragCancel={() => {
                setActiveDrag(null);
              }}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredGroups.map((group) => `group-${group.id}`)}
                strategy={verticalListSortingStrategy}
                disabled={savingOrder || Boolean(rankError)}
              >
                <div className="space-y-3">
                  {filteredGroups.map((group) => (
                    <SortableGroup
                      key={group.id}
                      group={group}
                      selected={
                        selectedItem?.type === "group" &&
                        selectedItem?.id === group.id
                      }
                      expanded={search ? true : (expandedGroups[group.id] ?? true)}
                      disabled={savingLayout}
                      onSelect={selectGroup}
                      onToggleExpanded={() =>
                        setExpandedGroups((current) => ({
                          ...current,
                          [group.id]: !(current[group.id] ?? true),
                        }))
                      }
                      onToggle={toggleGroup}
                      onAddField={() =>
                        addField({
                          groupId: group.id,

                          name: "New Module",

                          icon: "LuSettings2",
                        })
                      }
                    >
                      <SortableContext
                        items={group.data.map((item) => `item-${item.id}`)}
                        strategy={verticalListSortingStrategy}
                        disabled={savingOrder || Boolean(rankError)}
                      >
                        <div className="space-y-0.5">
                          {group.data.map((item) => (
                            <SortableField
                              key={item.id}
                              item={item}
                              groupId={group.id}
                              selected={
                                selectedItem?.type === "field" &&
                                selectedItem?.id === item.id
                              }
                              onSelect={selectField}
                              onToggle={toggleField}
                              disabled={savingLayout}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </SortableGroup>
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeDrag?.type === "group" ? (
                  <div className="rounded-xl border border-primary/30 bg-card px-4 py-3 shadow-xl">
                    <p className="text-sm font-semibold">Moving group</p>
                  </div>
                ) : activeDrag?.type === "item" ? (
                  <div className="rounded-xl border border-primary/30 bg-card px-4 py-3 shadow-xl">
                    <p className="text-sm font-medium">Moving module</p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>

        {/* =========================================================
                    RIGHT EDITOR
                   ========================================================= */}

        <div
          className="
                        min-h-0
                        overflow-hidden
                        bg-background
                    "
        >
          {selectedItem?.type === "group" && (
            <GroupEditor
              group={selectedObject}
              saving={savingLayout}
              onSave={saveGroup}
              onUpdate={(changes) => updateGroup(selectedItem.id, changes)}
              onDelete={deleteGroup}
              onAddField={() =>
                addField({
                  groupId: selectedObject?.id,

                  name: "New Module",

                  icon: "LuSettings2",
                })
              }
            />
          )}

          {selectedItem?.type === "field" && (
            <ItemEditor
              item={selectedObject}
              saving={savingLayout}
              crmModules={crmModules}
              modulesLoading={crmModulesLoading}
              modulesLoadError={crmModulesLoadError}
              onSave={saveField}
              onUpdate={(changes) => updateField(selectedItem.id, changes)}
              onDelete={deleteField}
            />
          )}

          {!selectedItem && <EmptyEditor />}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
