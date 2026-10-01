import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, Columns3, PanelRightClose, PanelRightOpen, RotateCcw, Search, Table2, Wrench } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { EmptyState, GhostButton, InlineAlert, LoadingBlock, PrimaryButton, Toggle } from "@/components/layouts/shared/Primitives";
import ViewPicker from "./parts/ViewPicker";
import ColumnsPane from "./parts/ColumnsPane";
import ColumnInspector from "./parts/ColumnInspector";
import StatusInspector from "./parts/StatusInspector";
import StatusList from "./parts/StatusList";
import useTableLayoutEditor from "./useTableLayoutEditor";
import usePresentationDrafts from "./usePresentationDrafts";
import { useModuleFields, useTableViewRegistry } from "@/queries/flexibility.queries";
import { DEFAULT_VIEW_KEY } from "@/utils/tableViewRegistry";
import { defaultsForModuleField } from "@/utils/tableLayout";
import { useLayoutDraftGuard } from "@/components/layouts/LayoutDraftContext";

export default function TableView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const moduleKey = searchParams.get("module") || "";
  const viewKey = searchParams.get("view") || DEFAULT_VIEW_KEY;
  const registry = useTableViewRegistry();
  const views = registry.data?.views || [];
  const selectedView = views.find((item) => item.moduleKey === moduleKey && item.viewKey === viewKey);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [section, setSection] = useState("columns");
  const [search, setSearch] = useState("");
  const editor = useTableLayoutEditor({
    moduleKey: selectedView?.moduleKey || null,
    viewKey: selectedView?.viewKey || null,
  });
  const { model, view, writing, selection, setSelection, contractError } = editor;
  const drafts = usePresentationDrafts(editor, moduleKey, viewKey);
  const dirty = editor.dirty || drafts.dirty;
  useLayoutDraftGuard(`layout-table-${moduleKey}-${viewKey}`, dirty);
  const showingStatuses = section === "statuses";
  const column = drafts.columns.find((item) => item.accessor === selection?.accessor);
  const status = drafts.statuses.find((item) => item.key === selection?.key);
  const needle = search.trim().toLowerCase();
  const matches = (item) => [item.label, item.accessor, item.key].some((value) => value?.toLowerCase().includes(needle));

  // `model.module` is the bean the view reads from. `moduleKey` is the view
  // catalog key and is not what SuiteCRM's vardefs are keyed by, so the field
  // library would come back empty if it were used here.
  const library = useModuleFields(model?.module || null);
  const inViewAccessors = new Set(editor.columns.map((item) => item.accessor));
  const stagedAccessors = new Set(editor.stagedFields.map((draft) => draft.accessor));

  // The library supplies the source field, and the defaults supply everything
  // the add-field dialog used to ask for. `rankAfter` names the column to sit
  // behind, and null appends - the backend generates the rank either way.
  const addFromLibrary = (field, rankAfter) => {
    if (writing) return;
    editor.addField(defaultsForModuleField(field, { rankAfter }));
  };

  useEffect(() => {
    if (!selectedView && registry.data?.views?.length) {
      const first = registry.data.views.find((item) => item.moduleKey === moduleKey)
        || registry.data.views.find((item) => item.active) || registry.data.views[0];
      setSearchParams({ module: first.moduleKey, view: first.viewKey }, { replace: true });
    }
  }, [moduleKey, selectedView, registry.data, setSearchParams]);

  useEffect(() => {
    if (!model) return;
    if (showingStatuses && !status && editor.statuses.length) {
      setSelection({ type: "status", key: editor.statuses[0].key });
    } else if (!showingStatuses && !column && editor.columns.length) {
      setSelection({ type: "column", accessor: editor.columns[0].accessor });
    }
  }, [model, showingStatuses, status, column, editor.statuses, editor.columns, setSelection]);

  const selectView = (next) => {
    if (writing) return;
    setSearch("");
    setSearchParams({ module: next.moduleKey, view: next.viewKey }, { replace: true });
  };
  const toggleColumn = (item) => {
    setSelection({ type: "column", accessor: item.accessor });
    drafts.patch("column", item.accessor, { visible: !item.visible });
  };
  const toggleStatus = (item) => {
    setSelection({ type: "status", key: item.key });
    drafts.patch("status", item.key, { visible: !item.visible });
  };
  const reload = () => {
    if (writing) return;
    drafts.resetAll();
    if (selectedView) editor.reload();
    registry.refetch();
  };
  const repair = async () => {
    if (!dirty || writing) return;
    await drafts.repair();
  };
  const rankError = showingStatuses ? editor.statusRankError : editor.rankError;

  const columnInspector = column ? (
    <ColumnInspector column={column} busy={writing}
      onPatch={(changes) => drafts.patch("column", column.accessor, changes)} />
  ) : (
    <EmptyState icon={Columns3} title="No columns to edit"
      description="Add a field from the list on the right to get started." />
  );

  return (
    <div className="flex min-h-0 flex-col">
      <div className="layout-editor-header flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Table View</h2>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs font-medium text-amber-700">Unapplied changes</span>}
          <GhostButton icon={RotateCcw} onClick={reload} disabled={writing || !dirty}>
            Discard
          </GhostButton>
          <PrimaryButton icon={Wrench} onClick={repair} disabled={writing || !dirty} busy={writing}>
            Repair
          </PrimaryButton>
        </div>
      </div>

      <div className="layout-editor-header flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <span className="text-sm font-medium text-foreground">Editing</span>
        <ViewPicker views={views} loading={registry.isPending} moduleKey={moduleKey}
          viewKey={viewKey} onSelect={selectView} disabled={writing} />
        {model && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Show view</span>
            <Toggle label="Show view" checked={view?.visible}
              disabled={writing || !view?.presentation?.visible?.writable}
              onChange={() => editor.setViewVisible(!view?.visible)} />
          </div>
        )}
      </div>

      {registry.error && (
        <div className="px-5 pt-3">
          <InlineAlert tone="warning" title="Could not load table views">
            {registry.error.message}
          </InlineAlert>
        </div>
      )}

      {!selectedView && !registry.isPending && !registry.error && !views.length && (
        <EmptyState icon={Table2} title="No table views found" description="Table views will appear here when they are added to the view catalog." />
      )}
      {(registry.isPending || (selectedView && editor.contractPending)) && <LoadingBlock label="Loading table view..." />}
      {moduleKey && contractError && (
        <div className="p-5">
          <InlineAlert title={contractError?.response?.status === 404 ? "This table view is not available yet" : "Could not load this view"}
            actions={<GhostButton onClick={reload} disabled={writing}>Try again</GhostButton>}>
            {contractError?.response?.status === 404 ? "Choose another view or try again after it has been published." : contractError.message}
          </InlineAlert>
        </div>
      )}

      {moduleKey && model && (
        <Tabs.Root value={section} onValueChange={(value) => { setSection(value); setSearch(""); }}
          className="min-h-0">
          <div className="layout-editor-header flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <Tabs.List aria-label="Table layout sections" className="inline-flex rounded-lg bg-muted/60 p-1">
              <Tabs.Trigger value="columns" className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Columns3 className="h-4 w-4" /> Columns
              </Tabs.Trigger>
              <Tabs.Trigger value="statuses" className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <BarChart3 className="h-4 w-4" /> Statuses
              </Tabs.Trigger>
            </Tabs.List>
            {!showingStatuses && (
              <GhostButton icon={libraryOpen ? PanelRightClose : PanelRightOpen}
                onClick={() => setLibraryOpen((open) => !open)}
                title={libraryOpen ? "Hide the field library" : "Show every field on this module"}>
                {libraryOpen ? "Hide fields" : "Add fields"}
              </GhostButton>
            )}
          </div>
          <Tabs.Content value={section} className="mt-0 outline-none">
            {showingStatuses ? (
              <div className="layout-view-grid layout-editor-grid min-h-[360px]">
                <div className="flex min-h-0 min-w-0 flex-col border-b border-border bg-card">
                  <div className="p-4">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input value={search} onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search statuses..." aria-label="Search statuses"
                        className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                    </div>
                  </div>
                  {rankError && <div className="px-4 pb-3"><InlineAlert tone="warning" title="Reordering is unavailable">
                    Reload this view to try again. You can still edit its settings.
                  </InlineAlert></div>}
                  <div className="layout-view-scroll min-h-0 flex-1 max-h-[min(52vh,560px)] overflow-y-auto px-3 pb-4">
                    <StatusList statuses={drafts.statuses.filter(matches)} allStatuses={drafts.statuses}
                      selection={selection} onSelect={(item) => setSelection({ type: "status", key: item.key })}
                      onToggleVisible={toggleStatus} onMove={editor.moveStatus}
                      busyStatusKey={editor.busyStatusKey} disabled={writing}
                      reorderDisabled={Boolean(rankError) || writing} searching={Boolean(needle)} />
                  </div>
                </div>
                <div className="min-h-0 min-w-0 bg-background">
                  {status ? (
                    <StatusInspector status={status} busy={writing}
                      onPatch={(changes) => drafts.patch("status", status.key, changes)}
                      onSetIcon={(item, icon) => drafts.patch("status", item.key, {
                        icon: { color: item.icon?.color || "", library: icon?.library || "", name: icon?.name || "" },
                      })} />
                  ) : (
                    <EmptyState icon={BarChart3} title="No statuses to edit"
                      description="This view has no statuses configured." />
                  )}
                </div>
              </div>
            ) : (
              <ColumnsPane
                columns={drafts.columns.filter(matches)}
                allColumns={drafts.columns}
                selection={selection}
                onSelect={(item) => setSelection({ type: "column", accessor: item.accessor })}
                onToggleVisible={toggleColumn}
                onMove={editor.moveColumn}
                busyAccessor={editor.busyAccessor}
                reorderDisabled={Boolean(rankError) || writing || Boolean(needle)}
                disabled={writing}
                search={search}
                onSearchChange={setSearch}
                searching={Boolean(needle)}
                rankError={rankError}
                inspector={columnInspector}
                libraryOpen={libraryOpen}
                module={model.module}
                library={library}
                inViewAccessors={inViewAccessors}
                stagedAccessors={stagedAccessors}
                stagedFields={editor.stagedFields}
                onAddField={addFromLibrary}
                onRemoveStaged={editor.removeStagedField}
              />
            )}
          </Tabs.Content>
        </Tabs.Root>
      )}
    </div>
  );
}
