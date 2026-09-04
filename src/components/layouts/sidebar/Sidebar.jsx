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
} from "lucide-react";

import IconInput from "@/components/IconInput";

import Icon from "@/components/ui/Icon/Icon";

import {
  useCrmModules,
  useLayoutPreferences,
  useUpdateLayout,
} from "@/queries/prefrences.queries";

import {
  groupScope,
  isPersistableId,
  moduleScope,
  normalizeSidebarResponse,
  SIDEBAR_GROUP_MODULE,
  SIDEBAR_MODULE_MODULE,
  toActiveFlag,
} from "@/utils/sidebarLayout";

import { RANK_FIELD, reorderCopy } from "@/utils/rank";

import { performRankMove } from "@/utils/rankMove";

import { isRankConflictError, requestRankMove } from "@/api/rank.api";

import {
  fetchLayout,
  fetchSidebarComponentId,
} from "@/api/prefrences.api";

import { preferenceKeys } from "@/queries/prefrences.queries";

import { useQueryClient } from "@tanstack/react-query";

import toast from "react-hot-toast";

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
        className={`
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
                        cursor-grab
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
          className={`min-w-0 flex-1 ${group.is_active ? "" : "opacity-45"}`}
        >
          <p className="truncate text-sm font-semibold text-foreground">
            {group.group_name}
          </p>

          <p className="text-[11px] text-muted-foreground">
            {group.is_active
              ? `${group.data.length} ${group.data.length === 1 ? "module" : "modules"}`
              : "Hidden from sidebar"}
          </p>
        </div>

        {/* ACTIVE */}

        <Toggle
          checked={group.is_active}
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
      className={`
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
                    cursor-grab
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

      <div className={`min-w-0 flex-1 ${item.is_active ? "" : "opacity-45"}`}>
        <p className="truncate text-xs font-medium text-foreground">
          {item.name}
        </p>

        {!item.is_active && (
          <p className="text-[10px] text-muted-foreground">
            Hidden from sidebar
          </p>
        )}
      </div>

      {/* ACTIVE */}

      <Toggle
        checked={item.is_active}
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

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Group
          </p>

          <h3 className="mt-1 text-base font-semibold">Group Settings</h3>
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
          </div>
        </div>
      </div>

      <div
        className={`grid gap-2 border-t border-border p-4 ${
          group.isNew ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {group.isNew && (
          <button
            type="button"
            onClick={() => onDelete(group)}
            className="
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-lg
                        border
                        border-destructive/20
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-destructive
                        hover:bg-destructive/10
                    "
          >
            <Trash2 className="h-3.5 w-3.5" />
            Discard Group
          </button>
        )}

        <button
          type="button"
          onClick={() => onSave(group)}
          disabled={saving || !group.group_name?.trim()}
          className="
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-lg
                        bg-primary
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-primary-foreground
                        hover:bg-primary/90
                        disabled:pointer-events-none
                        disabled:opacity-50
                    "
        >
          {saving ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {group.isNew ? "Create Group" : "Update Group"}
        </button>
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

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-border
                            bg-muted/30
                        "
          >
            <DynamicIcon
              icon={item.icon}
              library={item.library}
              className="
                                h-5
                                w-5
                                text-muted-foreground
                            "
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Sidebar Module
            </p>

            <h3 className="mt-1 truncate text-base font-semibold">
              {item.name || "Module"}
            </h3>
          </div>

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
              The icon_name and library are saved when you update the module.
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

      <div
        className={`grid gap-2 border-t border-border p-4 ${
          item.isNew ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {item.isNew && (
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-lg
                        border
                        border-destructive/20
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-destructive
                        hover:bg-destructive/10
                    "
          >
            <Trash2 className="h-3.5 w-3.5" />
            Discard Module
          </button>
        )}

        <button
          type="button"
          onClick={() => onSave(item)}
          disabled={
            saving || !item.name?.trim() || !item.module_name?.trim()
          }
          className="
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-lg
                        bg-primary
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-primary-foreground
                        hover:bg-primary/90
                        disabled:pointer-events-none
                        disabled:opacity-50
                    "
        >
          {saving ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {item.isNew ? "Create Module" : "Update Module"}
        </button>
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
   * overwrite optimistic state mid-request. A reorder is always
   * one write; toggles add their own.
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

    setGroups(normalized);

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
    if (pendingWrites.current > 0) {
      return;
    }

    applyServerLayout(layoutData);
  }, [layoutData, applyServerLayout]);

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

  /* =====================================================================
       RANK MOVE PLUMBING
       ===================================================================== */

  /**
   * One ordinary `update` per drag, carrying the destination
   * scope and the two neighbour IDs. The backend generates the
   * rank; nothing here does.
   *
   * The response carries no rank, so there is nothing to write
   * back into local state - the optimistic order already shows
   * the result, and the next ordinary fetch brings the
   * authoritative rank_key values.
   */
  const sendMove = async (args) => {
    /*
     * Only guards the window between the drop and the response,
     * so a refetch landing mid-write cannot undo the optimistic
     * order. Once the write is confirmed, the server order is
     * what we want.
     */
    pendingWrites.current += 1;

    try {
      return await requestRankMove(args);
    } finally {
      pendingWrites.current = Math.max(0, pendingWrites.current - 1);
    }
  };

  /**
   * Read the whole payload back from the server and display it.
   *
   * Runs after a confirmed reorder, so the editor shows the
   * order that was actually stored rather than the optimistic
   * guess. Also runs when a move is rejected or the rank data
   * is invalid, where local state cannot be trusted at all.
   *
   * `fetchQuery` writes into the same cache entry the live
   * sidebar reads, so the left-hand nav picks up the new order
   * from this one request too.
   */
  const reloadSidebar = async () => {
    pendingWrites.current = 0;

    const fresh = await queryClient.fetchQuery({
      queryKey: preferenceKeys.layout(),
      queryFn: fetchLayout,
      staleTime: 0,
    });

    return applyServerLayout(fresh);
  };

  /**
   * Shared tail for both reorder paths.
   *
   * `plan` describes the destination scope only. `restoreOrder`
   * undoes the optimistic order when the move is rejected;
   * the scope is then reloaded so the editor shows what the
   * server actually holds.
   */
  const runMove = ({ plan, restoreOrder }) =>
    performRankMove(plan, {
      requestMove: sendMove,
      isConflict: isRankConflictError,

      /*
       * The update response confirms the write but carries no
       * rank, so the new order is read back here. This is what
       * puts the server's order on screen instead of leaving
       * the optimistic one in place.
       */
      syncScope: () => reloadSidebar(),

      restoreOrder,

      reloadScope: () => reloadSidebar(),

      onSaving: setSavingOrder,

      onError: (message) => toast.error(message),
    });

  /* =====================================================================
       TOGGLE GROUP
       ===================================================================== */

  /**
   * Turning a group off hides the whole group, heading and
   * modules, from the live sidebar. The modules keep their
   * own is_active, so turning the group back on restores
   * whatever was visible before.
   *
   * `active` is optional: omit it to flip the current
   * value, pass it to set an explicit state.
   */
  const setGroupActive = (group, active) => {
    if (!group?.id) {
      return;
    }

    const nextActive = active === undefined ? !group.is_active : Boolean(active);

    if (nextActive === group.is_active) {
      return;
    }

    /**
     * Optimistic local update.
     */
    setGroups((current) =>
      current.map((item) =>
        item.id === group.id
          ? {
            ...item,
            is_active: nextActive,
          }
          : item,
      ),
    );

    if (isPersistableId(group.id)) {
      void saveLayoutRecord({
        action: "update",
        module: SIDEBAR_GROUP_MODULE,
        id: group.id,
        payload: { is_active: toActiveFlag(nextActive) },
      }).catch(() => {
        // The mutation hook reports the error and restores server state.
      });
    }
  };

  const toggleGroup = (group) => setGroupActive(group);

  /* =====================================================================
       TOGGLE FIELD
       ===================================================================== */

  const setFieldActive = (item, active) => {
    if (!item?.id) {
      return;
    }

    const nextActive = active === undefined ? !item.is_active : Boolean(active);

    if (nextActive === item.is_active) {
      return;
    }

    /**
     * Optimistic local update.
     */
    setGroups((current) =>
      current.map((group) => ({
        ...group,

        data: group.data.map((field) =>
          field.id === item.id
            ? {
              ...field,
              is_active: nextActive,
            }
            : field,
        ),
      })),
    );

    if (isPersistableId(item.id)) {
      void saveLayoutRecord({
        action: "update",
        module: SIDEBAR_MODULE_MODULE,
        id: item.id,
        payload: { is_active: toActiveFlag(nextActive) },
      }).catch(() => {
        // The mutation hook reports the error and restores server state.
      });
    }
  };

  const toggleField = (item) => setFieldActive(item);

  /* =====================================================================
       UPDATE GROUP LOCAL
       ===================================================================== */

  const updateGroup = (groupId, changes) => {
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
    if (savingRecord) {
      return;
    }

    const name = group?.group_name?.trim();

    if (!name) {
      toast.error("Enter a group name before saving.");
      return;
    }

    const isNew = !isPersistableId(group.id);

    setSavingRecord(true);

    try {
      const response = await saveLayoutRecord({
        action: isNew ? "create" : "update",
        module: SIDEBAR_GROUP_MODULE,
        id: isNew ? undefined : group.id,
        payload: {
          name,
          is_active: toActiveFlag(group.is_active),
        },
      });

      await reloadSidebar();

      if (response?.id) {
        setSelectedItem({ type: "group", id: response.id });
        setExpandedGroups((current) => ({
          ...current,
          [response.id]: true,
        }));
      }

      toast.success(isNew ? "Group created." : "Group updated.");
    } catch (error) {
      if (!error?.message?.startsWith("Layout ")) {
        toast.error(error?.message || "The group could not be saved.");
      }
    } finally {
      setSavingRecord(false);
    }
  };

  const saveField = async (item) => {
    if (savingRecord) {
      return;
    }

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

    if (!parentGroup || !isPersistableId(parentGroup.id)) {
      toast.error("Create the group before creating modules inside it.");
      return;
    }

    const isNew = !isPersistableId(item.id);

    setSavingRecord(true);

    try {
      const sidebarComponentId = isNew
        ? await fetchSidebarComponentId()
        : null;

      const response = await saveLayoutRecord({
        action: isNew ? "create" : "update",
        module: SIDEBAR_MODULE_MODULE,
        id: isNew ? undefined : item.id,
        payload: {
          name: item.name.trim(),
          fetch_from: item.module_name ?? "",
          icon_name: item.icon ?? "",
          library: item.library ?? "",
          navigation: item.navigation ?? "",
          group_name: parentGroup.group_name,
          is_active: toActiveFlag(item.is_active),
          outr_ui_groups_outr_ui_modules_1outr_ui_groups_ida: parentGroup.id,
          ...(sidebarComponentId
            ? {
                outr_global_component_outr_ui_modules_1outr_global_component_ida:
                  sidebarComponentId,
              }
            : {}),
        },
      });

      await reloadSidebar();

      if (response?.id) {
        setSelectedItem({ type: "field", id: response.id });
      }

      toast.success(isNew ? "Module created." : "Module updated.");
    } catch (error) {
      if (!error?.message?.startsWith("Layout ")) {
        toast.error(error?.message || "The module could not be saved.");
      }
    } finally {
      setSavingRecord(false);
    }
  };

  /* =====================================================================
       DELETE GROUP - LOCAL ONLY
       ===================================================================== */

  const deleteGroup = (group) => {
    setGroups((current) => current.filter((item) => item.id !== group.id));

    setSelectedItem(null);
  };

  /* =====================================================================
       DELETE FIELD - LOCAL ONLY
       ===================================================================== */

  const deleteField = (item) => {
    setGroups((current) =>
      current.map((group) => {
        if (!group.data.some((field) => field.id === item.id)) {
          return group;
        }

        return {
          ...group,

          data: group.data.filter((field) => field.id !== item.id),
        };
      }),
    );

    setSelectedItem(null);
  };

  /* =====================================================================
       ADD GROUP - LOCAL ONLY
       ===================================================================== */

  const addGroup = (name) => {
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

      is_active: true,

      module: SIDEBAR_GROUP_MODULE,

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
  };

  /* =====================================================================
       ADD FIELD - LOCAL ONLY
       ===================================================================== */

  const addField = ({ groupId, name, icon }) => {
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

          module: SIDEBAR_MODULE_MODULE,

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

          is_active: true,

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

    /* Optimistic: show the new order while the write runs. */
    setGroups(reordered);

    return runMove({
      plan: {
        items: reordered,
        movedId,
        scope: groupScope(),
        module: SIDEBAR_GROUP_MODULE,
      },

      restoreOrder: () => setGroups(sourceGroups),
    });
  };

  /* =====================================================================
       MOVE A FIELD
       ===================================================================== */

  /**
   * Scope: the modules of one group_name.
   *
   * Neighbours are read from the DESTINATION group only. The
   * source group just loses a record; the records left behind
   * keep their ranks, because removing an item never
   * invalidates the ranks around it.
   *
   * `group_name` is sent on every module move, not only
   * cross-group ones, so the backend always knows which scope
   * to validate the neighbours against.
   */
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

    return runMove({
      plan: {
        items: targetFields,
        movedId,
        scope: moduleScope(targetGroup.group_name),
        module: SIDEBAR_MODULE_MODULE,

        /* Destination scope, always sent. */
        scopeFields: { group_name: targetGroup.group_name },
      },

      restoreOrder: () => setGroups(sourceGroups),
    });
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

      if (!isPersistableId(activeGroupId)) {
        toast.error("Save this group in the CRM before reordering it.");
        return;
      }

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

      if (!isPersistableId(targetGroup.id)) {
        toast.error("Create the target group before moving modules into it.");
        return;
      }

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

      if (!isPersistableId(activeItemId)) {
        toast.error("Create this module in the CRM before reordering it.");
        return;
      }

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
    <div className="flex h-full min-h-0 flex-col">
      {/* HEADER */}

      <div
        className="
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
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Configure sidebar groups, modules, visibility and ordering.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savingOrder && (
            <span
              role="status"
              className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
            >
              Saving order...
            </span>
          )}

          <button
            type="button"
            onClick={resetChanges}
            disabled={savingLayout || savingOrder}
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
            Reset
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
                            bg-primary
                            px-3
                            py-2
                            text-sm
                            font-medium
                            text-primary-foreground
                            disabled:pointer-events-none
                            disabled:opacity-50
                        "
          >
            <Plus className="h-4 w-4" />
            Add Group
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
                    grid
                    min-h-0
                    flex-1
                    grid-cols-1
                    overflow-hidden
                    lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]
                "
      >
        {/* =========================================================
                    LEFT SIDEBAR BUILDER
                   ========================================================= */}

        <div
          className="
                        flex
                        min-h-0
                        flex-col
                        border-b
                        border-border
                        bg-card
                        lg:border-b-0
                        lg:border-r
                    "
        >
          {/* SEARCH */}

          <div className="shrink-0 border-b border-border p-3">
            <div className="relative">
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

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
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
