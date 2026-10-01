/**
 * The Detail & Edit view editor, and - through a nine-line wrapper that only
 * changes `viewKey` - the Create view editor too. One component, two routes.
 *
 * The draft IS the layout: edits are applied to a local copy of the contract and
 * nothing is written until Repair. Which properties
 * can be written is decided by the contract, not by this file: every control is
 * live only if Flexibility returned a mutation for that property on that node.
 *
 * The ordering key is never shown. It is generated, opaque, and set by dragging.
 */

import React, { useEffect, useMemo, useState } from "react";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import {
  Layers3,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Search,
  Wrench,
  X,
} from "lucide-react";

import toast from "react-hot-toast";

import {
  useCreateTableField,
  useModuleFields,
  useUiPropertyWrite,
  useViewContract,
} from "@/queries/flexibility.queries";

import { describeMetadataWriteError } from "@/api/flexibility.api";

import {
  buildDetailFieldCreatePayload,
  childrenAt,
  detailFieldType,
  nodeKey,
  nodeMutation,
  nodeWritable,
  planMove,
  replaceChildren,
  replaceNode,
} from "@/utils/detailEditLayout";

import { PROPERTY_LABELS, defaultsForModuleField } from "@/utils/tableLayout";
import { RighteeUiRank, between } from "@/utils/uiRank";

import FieldLibrary from "@/components/layouts/shared/FieldLibrary";
import FieldTypeIcon from "@/components/layouts/shared/FieldTypeIcon";
import { GhostButton, InlineAlert } from "@/components/layouts/shared/Primitives";
import { useLayoutDraftGuard } from "@/components/layouts/LayoutDraftContext";

import NodeInspector from "./parts/NodeInspector";
import { ScopeList } from "./parts/NodeTree";
import {
  collectDraftChanges,
  idFor,
  nextScope,
  placedFieldAccessors,
  rowIdFor,
} from "./parts/draftChanges";

const MODULE_KEY = "contacts";
const VIEW_KEY = "detail";
const ROOT = { type: "block" };

/**
 * Restricted per drag. A node reorder may only land on another node, and a
 * library field may only land on a section or a field - dropping one onto a tab
 * would have no section to go in.
 */
const collisionDetectionStrategy = (args) =>
  closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => container.data?.current?.type === "node",
    ),
  });

export default function Views({
  moduleKey = MODULE_KEY,
  viewKey = VIEW_KEY,
  title = "Contact Detail View",
}) {
  const query = useViewContract(moduleKey, viewKey);
  const writer = useUiPropertyWrite();

  /*
   * Named for the table because that is where it was first needed, but it is
   * generic: it posts one guarded `outr_ui_fields` create and re-reads the
   * contract. A detail field publishes through exactly the same hook.
   */
  const fieldCreate = useCreateTableField();

  const [layout, setLayout] = useState(null);
  const [selection, setSelection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    if (query.data && !dirty && !saving) setLayout(query.data);
  }, [dirty, query.data, saving]);

  useLayoutDraftGuard(`layout-${moduleKey}-${viewKey}`, dirty);

  /*
   * `layout.module` is the bean the view reads from. `moduleKey` is the view
   * catalog key and is not what SuiteCRM's vardefs are keyed by, so the field
   * library would come back empty if it were used here.
   */
  const beanModule = layout?.module || query.data?.module || null;
  const library = useModuleFields(beanModule);

  const { changes, creates } = useMemo(() => {
    if (!query.data || !layout) return { changes: [], creates: [] };

    return collectDraftChanges(query.data, layout);
  }, [layout, query.data]);

  /* Row ids of staged additions, so the tree can badge them. */
  const newKeys = useMemo(
    () => new Set(creates.map((item) => rowIdFor(item.scope, item.itemId))),
    [creates],
  );

  const selectedItem = useMemo(
    () =>
      selection
        ? childrenAt(layout, selection.scope).find(
            (item) => nodeKey(item) === selection.itemId,
          )
        : null,
    [layout, selection],
  );

  const selectedIsNew = Boolean(
    selection && newKeys.has(rowIdFor(selection.scope, selection.itemId)),
  );

  /* The field scope a new field would go into, derived from what is selected. */
  const activeFieldScope = useMemo(() => {
    if (!selection || !selectedItem) return null;

    if (selection.scope.type === "field") return selection.scope;

    if (selection.scope.type === "section") {
      return nextScope(selection.scope, selectedItem);
    }

    return null;
  }, [selectedItem, selection]);

  /*
   * Staged field additions are in the draft tree, so `placedFieldAccessors`
   * counts them. Splitting them out is what lets the library mark them "Staged"
   * with a remove button rather than "In view", which would imply they are
   * already published and offer no way back.
   */
  const stagedFieldAccessors = useMemo(
    () =>
      new Set(
        creates.filter((item) => item.type === "field").map((item) => item.itemId),
      ),
    [creates],
  );

  const placed = useMemo(() => {
    const all = placedFieldAccessors(layout);

    stagedFieldAccessors.forEach((accessor) => all.delete(accessor));

    return all;
  }, [layout, stagedFieldAccessors]);

  /* ------------------------------------------------------------ editing */

  const reset = () => {
    setLayout(query.data || null);
    setSelection(null);
    setSearch("");
    setDirty(false);
  };

  const patch = (scope, itemId, nextValues) => {
    setLayout((current) => replaceNode(current, scope, itemId, nextValues));
    setDirty(true);
  };

  const toggle = (scope, item) => {
    setSelection({ scope, itemId: nodeKey(item) });
    patch(scope, nodeKey(item), { visible: item.visible === false });
  };

  /** Drop a staged addition. Only ever a node the server has never seen. */
  const removeStaged = (scope, itemId) => {
    const siblings = childrenAt(layout, scope);

    setLayout(
      replaceChildren(
        layout,
        scope,
        siblings.filter((item) => nodeKey(item) !== itemId),
      ),
    );

    if (selection?.itemId === itemId) setSelection(null);
  };

  /* --------------------------------------------------------- add a field */

  const addField = (field, target) => {
    if (saving || !target) return;

    const siblings = childrenAt(layout, target.scope);

    if (siblings.some((item) => nodeKey(item) === field.name)) {
      toast.error(`"${field.name}" is already in this section.`);

      return;
    }

    /*
     * Always appended, never inserted at the drop position.
     *
     * The create payload carries no `rank_after`, so the backend decides the
     * position and puts the field last. Showing it mid-list in the draft would
     * be a position that Repair then silently changes. Dropping still chooses
     * the SECTION, which is the part that matters; order is set by dragging it
     * afterwards, which writes a rank that does hold.
     */
    const index = siblings.length;

    try {
      const { lower, upper } = RighteeUiRank.neighborRanksAt(siblings, index);
      const defaults = defaultsForModuleField(field);

      const node = {
        accessor: defaults.accessor,
        label: defaults.label,

        /*
         * The detail vocabulary, not the table's. `defaultsForModuleField`
         * resolves a column type, which is a different set - `enum` vs `select`,
         * `bool` vs `boolean`.
         */
        type: detailFieldType(field.type),
        editable: true,
        readonly: false,
        required: false,
        placeholder: "",
        visible: true,
        rank: between(lower, upper),

        /*
         * Draft-only. The create payload needs the RAW vardef type (`varchar`)
         * for `vardef_type`, which the backend validates against the bean, while
         * `type` above is what the renderer uses (`text`). The published field
         * carries only the latter, so the raw one has to be kept here until
         * Repair. It is absent from the diff list, so it never becomes a change.
         */
        sourceVardefType: field.type,
      };

      const next = [...siblings];
      next.splice(index, 0, node);

      setLayout(replaceChildren(layout, target.scope, next));
      setSelection({ scope: target.scope, itemId: nodeKey(node) });
      setDirty(true);
      toast.success(`"${defaults.label}" added to the layout.`);
    } catch (error) {
      toast.error(error.message || "That field could not be placed.");
    }
  };

  /* ---------------------------------------------------------------- drag */

  /** Where a dragged library field would land, or null if nowhere valid. */
  const fieldDropTarget = (over) => {
    const data = over?.data?.current;

    if (!data || data.type !== "node") return null;

    /* Dropped onto a field: it joins that field's section. */
    if (data.scope.type === "field") {
      return { scope: data.scope };
    }

    /* Dropped onto a section: it joins that section. */
    if (data.scope.type === "section") {
      return {
        scope: {
          type: "field",
          blockId: data.scope.blockId,
          tabId: data.scope.tabId,
          sectionId: data.itemId,
        },
      };
    }

    return null;
  };

  const clearDrag = () => {
    setDragging(null);
    setDropTargetId(null);
  };

  const onDragOver = ({ active, over }) => {
    if (active.data.current?.type !== "library-field") return;

    setDropTargetId(fieldDropTarget(over) ? String(over.id) : null);
  };

  const onDragEnd = ({ active, over }) => {
    const type = active.data.current?.type;

    clearDrag();

    if (!over || saving) return;

    if (type === "library-field") {
      const target = fieldDropTarget(over);

      if (!target) {
        toast.error("Drop a field onto a section, or onto another field.");

        return;
      }

      addField(active.data.current.field, target);

      return;
    }

    const from = active.data.current;
    const to = over.data.current;

    /* Same container only: neighbours in another scope give a wrong position. */
    if (!from || !to || JSON.stringify(from.scope) !== JSON.stringify(to.scope)) {
      return;
    }

    try {
      const plan = planMove(layout, from.scope, from.itemId, to.itemId);

      if (!plan) return;

      setLayout(plan.nextLayout);
      setDirty(true);
    } catch (error) {
      toast.error(error.message || "Order could not be changed.");
    }
  };

  /* ------------------------------------------------------------- publish */

  /**
   * Re-apply the drafts that were NOT part of this publish onto the fresh
   * contract, so updating one node does not silently discard edits to another.
   */
  const reapply = (base, pendingChanges, pendingCreates, draft) => {
    let next = base;

    pendingCreates.forEach(({ scope, itemId }) => {
      const node = childrenAt(draft, scope).find(
        (item) => nodeKey(item) === itemId,
      );

      if (!node) return;

      try {
        const siblings = childrenAt(next, scope);

        if (siblings.some((item) => nodeKey(item) === itemId)) return;

        next = replaceChildren(next, scope, [...siblings, node]);
      } catch {
        /* The parent is gone from the new contract; the addition cannot survive. */
      }
    });

    pendingChanges.forEach((change) => {
      next = replaceNode(next, change.scope, change.itemId, {
        [change.property]: change.value,
      });
    });

    return next;
  };

  const publish = async () => {
    if (saving || !query.data || !layout) return;

    const target = changes;

    if (!target.length && !creates.length) return;

    setSaving(true);

    /*
     * Field creates are structural writes against the whole view.
     */
    const attemptedCreates = creates.filter((item) => item.type === "field");

    /* Tabs and sections have no vardef behind them, so there is nothing to create. */
    const skippedCreates = creates.filter((item) => item.type !== "field");

    const failedCreates = [];

    try {
      let contract = query.data;

      for (const change of target) {
        const node = childrenAt(contract, change.scope).find(
          (item) => nodeKey(item) === change.itemId,
        );

        if (!node) {
          throw new Error(
            "A changed layout item is no longer available. Discard and try again.",
          );
        }

        if (!nodeWritable(node, change.property)) {
          throw new Error(
            `${PROPERTY_LABELS[change.property] ?? change.property} cannot be changed for this ${change.scope.type}.`,
          );
        }

        const result = await writer.mutateAsync({
          mutation: nodeMutation(node, change.property, change.value),
          moduleKey,
          viewKey,
        });

        contract = result.contract;
      }

      /*
       * Field creates, after the property writes.
       *
       * Each one is published against the config version from the contract the
       * PREVIOUS write returned, which is why the contract is re-read into
       * `contract` every iteration - a create carries
       * `expected_config_version`, and the backend rejects a stale one by
       * design.
       *
       * A failure here is caught per field rather than aborting: one field the
       * backend will not take must not strand the others, and the real error is
       * more useful surfaced than swallowed.
       */
      for (const create of attemptedCreates) {
        const node = childrenAt(layout, create.scope).find(
          (item) => nodeKey(item) === create.itemId,
        );

        if (!node) continue;

        try {
          const payload = buildDetailFieldCreatePayload({
            accessor: node.accessor,
            label: node.label,
            renderType: node.type,
            vardefType: node.sourceVardefType,
            visible: node.visible !== false,
            editable: node.editable,
            readonly: node.readonly,
            required: node.required,
            placeholder: node.placeholder,

            /* The section is the whole address; no tab or block id is sent. */
            sectionId: create.scope.sectionId,

            sourceModule: contract.module,
            moduleKey,
            viewKey,
            expectedConfigVersion: contract.configVersion,
          });

          const result = await fieldCreate.mutateAsync({
            payload,
            moduleKey,
            viewKey,
          });

          contract = result.contract;
        } catch (error) {
          failedCreates.push({ ...create, error });
        }
      }

      const unpublished = [...skippedCreates, ...failedCreates];

      setLayout(reapply(contract, [], unpublished, layout));
      setDirty(unpublished.length > 0);

      const published =
        target.length + (attemptedCreates.length - failedCreates.length);

      if (published) {
        toast.success(
          published === 1 ? "Change published." : `${published} changes published.`,
        );
      }

      /*
       * Reported after the successful writes rather than instead of them. A
       * staged addition must not block unrelated visibility and order edits.
       */
      if (failedCreates.length) {
        toast.error(
          `Could not add ${failedCreates.map((item) => item.label).join(", ")}: ${describeMetadataWriteError(failedCreates[0].error)}`,
          { duration: 10000 },
        );
      }

      if (skippedCreates.length) {
        toast.error(
          `${skippedCreates.map((item) => item.label).join(", ")} stayed in the draft. This view's contract only supports adding fields, not ${skippedCreates.length === 1 ? "a " : ""}${[...new Set(skippedCreates.map((item) => item.type))].join(" or ")}${skippedCreates.length === 1 ? "" : "s"}.`,
          { duration: 8000 },
        );
      }
    } catch (error) {
      toast.error(describeMetadataWriteError(error));
    } finally {
      setSaving(false);
    }
  };

  const repair = () => publish();

  /* -------------------------------------------------------------- render */

  const blocks = layout?.blocks || [];
  const needle = search.trim().toLowerCase();

  const shownBlocks = needle
    ? blocks.filter((block) =>
        JSON.stringify(block).toLowerCase().includes(needle),
      )
    : blocks;

  const treeDisabled = saving || Boolean(needle);

  return (
    <div className="detail-layout-editor flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background">
      <header className="layout-editor-header flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Layers3 className="h-5 w-5 text-primary" />

            <h2 className="text-lg font-semibold">{title}</h2>

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
          {saving && (
            <span className="text-xs font-medium text-primary">Repairing...</span>
          )}

          <GhostButton
            icon={libraryOpen ? PanelRightClose : PanelRightOpen}
            onClick={() => setLibraryOpen((open) => !open)}
            title={
              libraryOpen
                ? "Hide the field library"
                : "Show every field on this module"
            }
          >
            {libraryOpen ? "Hide fields" : "Add fields"}
          </GhostButton>

          <GhostButton
            icon={RotateCcw}
            onClick={reset}
            disabled={!layout || saving || !dirty}
          >
            Discard
          </GhostButton>

          <button
            type="button"
            onClick={repair}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            <Wrench className="h-4 w-4" />
            Repair
          </button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={({ active }) => setDragging(active.data.current)}
        onDragCancel={clearDrag}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div
          className={`detail-layout-workspace layout-view-grid min-h-0 overflow-hidden ${libraryOpen ? "layout-editor-grid--library" : "layout-editor-grid"}`}
        >
          {/* ------------------------------------------------------- TREE */}

          <section className="layout-tree-pane flex h-full min-h-0 flex-col overflow-hidden bg-card">
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tabs, sections or fields..."
                  aria-label="Search the layout"
                  className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {creates.length > 0 && (
              <div className="border-b border-border px-3 py-3">
                <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-3">
                  <p className="text-xs font-medium text-primary">
                    {creates.length} new{" "}
                    {creates.length === 1 ? "item" : "items"} in this draft
                  </p>

                  <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                    {creates.every((item) => item.type === "field")
                      ? "Repair publishes these into the layout."
                      : "Repair publishes new fields. Tabs and sections have no source field behind them, so those stay in the draft."}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {creates.map((item) => (
                      <span
                        key={rowIdFor(item.scope, item.itemId)}
                        title={`${item.itemId} · new ${item.type}`}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-card py-0.5 pl-2 pr-1 text-[10px] font-medium text-foreground"
                      >
                        {item.label}

                        <button
                          type="button"
                          onClick={() => removeStaged(item.scope, item.itemId)}
                          disabled={saving}
                          aria-label={`Remove ${item.label} from this draft`}
                          className="flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div
              role="region"
              aria-label="Layout structure"
              tabIndex={0}
              className="layout-view-scroll custom-scrollbar min-h-0 flex-1 max-h-[min(60vh,640px)] overflow-y-auto p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
            >
              {query.isPending && (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Loading layout...
                </p>
              )}

              {query.error && (
                <InlineAlert title="Could not load this layout">
                  {query.error.message}
                </InlineAlert>
              )}

              {layout && (
                <SortableContext
                  items={shownBlocks.map((block) => idFor(ROOT, block))}
                  strategy={verticalListSortingStrategy}
                  disabled={{ draggable: treeDisabled, droppable: false }}
                >
                  <div className="space-y-3">
                    <ScopeList
                      scope={ROOT}
                      layout={{ ...layout, blocks: shownBlocks }}
                      selected={selection}
                      disabled={treeDisabled}
                      newKeys={newKeys}
                      dropTargetId={dropTargetId}
                      onSelect={(scope, node) =>
                        setSelection({ scope, itemId: nodeKey(node) })
                      }
                      onToggle={toggle}
                    />
                  </div>
                </SortableContext>
              )}
            </div>
          </section>

          {/* -------------------------------------------------- INSPECTOR */}

          <aside className="min-h-0 bg-background">
            <NodeInspector
              selection={selection}
              item={selectedItem}
              isNew={selectedIsNew}
              busy={saving}
              viewKey={viewKey}
              onPatch={(next) => patch(selection.scope, selection.itemId, next)}
              onRemove={
                selectedIsNew
                  ? () => removeStaged(selection.scope, selection.itemId)
                  : null
              }
            />
          </aside>

          {/* ---------------------------------------------- FIELD LIBRARY */}

          {libraryOpen && (
            <div className="min-h-0 min-w-0 bg-card">
              <FieldLibrary
                module={beanModule}
                fields={library.data}
                loading={library.isPending}
                refreshing={library.isFetching && !library.isPending}
                error={library.error}
                onRetry={library.refetch}
                inViewAccessors={placed}
                stagedAccessors={stagedFieldAccessors}
                onAdd={(field) =>
                  activeFieldScope
                    ? addField(field, { scope: activeFieldScope })
                    : toast.error(
                        "Select a section first, or drag the field onto one.",
                      )
                }
                onRemoveStaged={(accessor) => {
                  const create = creates.find(
                    (item) => item.type === "field" && item.itemId === accessor,
                  );

                  if (create) removeStaged(create.scope, create.itemId);
                }}
                disabled={saving}
                itemNoun="field"
                dropTargetLabel="section"
                showDescription={false}
              />
            </div>
          )}
        </div>

        <DragOverlay>
          {dragging?.type === "library-field" && dragging.field ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-card px-3 py-2 shadow-xl">
              <FieldTypeIcon type={dragging.field.type} />

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {dragging.field.label}
                </p>

                <p className="truncate font-mono text-[10px] leading-4 text-muted-foreground">
                  {dragging.field.name}
                </p>
              </div>
            </div>
          ) : dragging?.itemId ? (
            <div className="rounded-lg border border-primary/30 bg-card px-3 py-2 shadow-xl">
              <p className="text-sm font-medium text-foreground">
                {dragging.itemId}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
