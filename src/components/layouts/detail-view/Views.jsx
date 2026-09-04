import React, { useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Layers3, Plus, RotateCcw, Search, Settings2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useUiPropertyWrite, useViewContract } from "@/queries/flexibility.queries";
import { childrenAt, nodeKey, planMove, rankMutation, replaceChildren, replaceNode, scopePath, visibilityMutation } from "@/utils/detailEditLayout";
import { between } from "@/utils/uiRank";

const MODULE_KEY = "contacts";
const VIEW_KEY = "detail";
const TYPES = { block: "Block", tab: "Tab", section: "Section", field: "Field" };
const idFor = (scope, item) => [scope.type, scope.blockId, scope.tabId, scope.sectionId, nodeKey(item)].filter(Boolean).join(":");
const titleOf = (item) => item.title || item.label || item.accessor || item.id;

function Toggle({ checked, onChange, disabled }) {
  return <button type="button" onClick={(e) => { e.stopPropagation(); onChange(); }} disabled={disabled} aria-pressed={checked} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"} disabled:opacity-40`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-primary-foreground shadow-sm transition-all ${checked ? "left-6" : "left-1"}`} /></button>;
}

function AddButton({ type, onClick }) {
  return <button type="button" onClick={onClick} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"><Plus className="h-3.5 w-3.5" />Add {type}</button>;
}

function nextScope(scope, item) {
  const id = nodeKey(item);
  if (scope.type === "block") return item.type === "tabs" ? { type: "tab", blockId: id } : null;
  if (scope.type === "tab") return { type: "section", blockId: scope.blockId, tabId: id };
  if (scope.type === "section") return { type: "field", blockId: scope.blockId, tabId: scope.tabId, sectionId: id };
  return null;
}

function SortableNode({ item, scope, layout, selected, disabled, onSelect, onToggle, onAdd }) {
  const [open, setOpen] = useState(true);
  const sortable = useSortable({ id: idFor(scope, item), disabled, data: { scope, itemId: nodeKey(item) } });
  const childScope = nextScope(scope, item);
  const children = childScope ? childrenAt(layout, childScope) : [];
  const active = selected?.itemId === nodeKey(item) && JSON.stringify(selected.scope) === JSON.stringify(scope);
  const isContainer = scope.type !== "field";
  return <div ref={sortable.setNodeRef} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }} className={`${isContainer ? "overflow-hidden rounded-xl border bg-card" : "rounded-lg"} ${active ? "border-primary/40 bg-primary/[0.03] shadow-sm" : isContainer ? "border-border" : ""} ${sortable.isDragging ? "opacity-40" : ""}`}>
    <div onClick={() => onSelect(scope, item)} className={`flex cursor-pointer items-center gap-2 px-2 ${isContainer ? "py-2.5" : "py-2 hover:bg-accent/60"}`}>
      <button type="button" {...sortable.attributes} {...sortable.listeners} onClick={(e) => e.stopPropagation()} disabled={disabled} className="grid h-7 w-5 shrink-0 cursor-grab place-items-center rounded text-muted-foreground/40 hover:bg-accent hover:text-foreground active:cursor-grabbing disabled:opacity-30"><GripVertical className="h-3.5 w-3.5" /></button>
      {isContainer && <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted-foreground"><Settings2 className="h-4 w-4" /></button>}
      <div className="min-w-0 flex-1"><p className={`${isContainer ? "text-sm font-semibold" : "text-xs font-medium"} truncate ${item.visible === false ? "opacity-45" : ""}`}>{titleOf(item)}</p><p className="text-[10px] text-muted-foreground">{isContainer ? `${children.length} ${childScope?.type || "item"}${children.length === 1 ? "" : "s"}` : item.accessor}{item.visible === false ? " · Hidden" : ""}</p></div>
      <span className="max-w-16 truncate font-mono text-[9px] text-muted-foreground">{item.rank || "—"}</span>
      <Toggle checked={item.visible !== false} disabled={disabled} onChange={() => onToggle(scope, item)} />
      {isContainer && <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="grid h-7 w-7 place-items-center rounded hover:bg-accent">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>}
    </div>
    {isContainer && open && childScope && <div className="border-t border-border px-2 py-1.5">
      <ScopeList scope={childScope} layout={layout} selected={selected} disabled={disabled} onSelect={onSelect} onToggle={onToggle} onAdd={onAdd} />
      <AddButton type={childScope.type} onClick={() => onAdd(childScope.type, childScope)} />
    </div>}
  </div>;
}

function ScopeList(props) {
  const items = childrenAt(props.layout, props.scope);
  return <SortableContext items={items.map((item) => idFor(props.scope, item))} strategy={verticalListSortingStrategy}><div className={props.scope.type === "field" ? "space-y-0.5" : "space-y-2"}>{items.map((item) => <SortableNode key={idFor(props.scope, item)} item={item} {...props} />)}</div></SortableContext>;
}

function Inspector({ selection, item, busy, onToggle, onAdd }) {
  if (!item) return <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-8 text-center"><div className="mb-4 grid h-12 w-12 place-items-center rounded-xl border border-border bg-muted/20"><Settings2 className="h-5 w-5 text-muted-foreground" /></div><h3 className="text-sm font-semibold">Nothing selected</h3><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Select a block, tab, section or field to configure it.</p></div>;
  const childScope = nextScope(selection.scope, item);
  return <div className="flex h-full flex-col">
    <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{TYPES[selection.scope.type]}</p><h3 className="mt-1 text-base font-semibold">{TYPES[selection.scope.type]} Settings</h3></div><Toggle checked={item.visible !== false} disabled={busy} onChange={() => onToggle(selection.scope, item)} /></div>
    <div className="space-y-5 p-5"><div><label className="mb-1.5 block text-xs font-medium">Name</label><input value={titleOf(item)} readOnly className="h-10 w-full rounded-lg border border-border bg-muted/20 px-3 text-sm outline-none" /></div><div><label className="mb-1.5 block text-xs font-medium">Rank</label><input value={item.rank || ""} readOnly className="h-10 w-full rounded-lg border border-border bg-muted/30 px-3 font-mono text-sm text-muted-foreground outline-none" /><p className="mt-1.5 text-[10px] text-muted-foreground">Position in this container. Drag the item on the left to change it.</p></div><div className="flex items-center justify-between rounded-xl border border-border p-4"><div><p className="text-sm font-semibold">Show in detail view</p><p className="mt-0.5 text-xs text-muted-foreground">Enable or hide this {selection.scope.type}.</p></div><Toggle checked={item.visible !== false} disabled={busy} onChange={() => onToggle(selection.scope, item)} /></div>{childScope && <div><div className="mb-2 flex items-center justify-between"><div><p className="text-sm font-semibold capitalize">{childScope.type}s</p><p className="text-xs text-muted-foreground">Manage items from the layout tree.</p></div><button type="button" onClick={() => onAdd(childScope.type, childScope)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"><Plus className="h-3.5 w-3.5" />Add</button></div></div>}</div>
  </div>;
}

function AddDialog({ request, onClose, onSubmit }) {
  const [label, setLabel] = useState(""); const [accessor, setAccessor] = useState("");
  if (!request) return null; const field = request.type === "field";
  return <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4" onMouseDown={onClose}><form onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSubmit(label.trim(), accessor.trim()); }} className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-2xl"><div className="flex justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-wider text-primary">New {request.type}</p><h3 className="mt-1 text-lg font-semibold">Add {request.type}</h3></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded hover:bg-accent"><X className="h-4 w-4" /></button></div><label className="mt-5 block text-xs font-medium">Label</label><input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary/50" />{field && <><label className="mt-4 block text-xs font-medium">Accessor</label><input value={accessor} onChange={(e) => setAccessor(e.target.value)} placeholder="field_name" className="mt-1.5 h-10 w-full rounded-lg border border-border px-3 font-mono text-sm outline-none focus:border-primary/50" /></>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button><button disabled={!label.trim() || (field && !accessor.trim())} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">Add {request.type}</button></div></form></div>;
}

export default function Views({
  moduleKey = MODULE_KEY,
  viewKey = VIEW_KEY,
  title = "Contact Detail View",
}) {
  const query = useViewContract(moduleKey, viewKey); const writer = useUiPropertyWrite();
  const [layout, setLayout] = useState(null); const [selection, setSelection] = useState(null); const [saving, setSaving] = useState(false); const [addRequest, setAddRequest] = useState(null); const [search, setSearch] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  useEffect(() => { if (query.data) setLayout(query.data); }, [query.data]);
  const selectedItem = useMemo(() => selection ? childrenAt(layout, selection.scope).find((item) => nodeKey(item) === selection.itemId) : null, [layout, selection]);
  const reset = () => { setLayout(query.data || null); setSelection(null); setAddRequest(null); setSearch(""); };
  const addNode = (label, accessor) => { const { type, scope } = addRequest; const siblings = childrenAt(layout, scope); const rank = between(siblings.at(-1)?.rank ?? null, null); const id = (accessor || label).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `${type}_${Date.now()}`; if (siblings.some((x) => nodeKey(x) === id)) return toast.error("That identifier already exists."); const item = type === "tab" ? { id, label, module: moduleKey, rank, sections: [], visible: true, isNew: true } : type === "section" ? { id, title: label, module: moduleKey, type: "section", columns: 2, editable: true, rank, fields: [], visible: true, isNew: true } : { accessor, label, type: "text", editable: true, rank, visible: true, isNew: true }; setLayout(replaceChildren(layout, scope, [...siblings, item])); setSelection({ scope, itemId: nodeKey(item) }); setAddRequest(null); };
  const toggle = async (scope, item) => { const previous = layout, visible = item.visible === false; setLayout(replaceNode(layout, scope, nodeKey(item), { visible })); if (item.isNew) return; setSaving(true); try { await writer.mutateAsync({ mutation: visibilityMutation(layout, item, scopePath(scope, item), visible), moduleKey, viewKey }); toast.success(visible ? "Item shown." : "Item hidden."); } catch (error) { setLayout(previous); toast.error(error.message || "Visibility could not be saved."); } finally { setSaving(false); } };
  const onDragEnd = async ({ active, over }) => { if (!over || saving) return; const from = active.data.current, to = over.data.current; if (!from || !to || JSON.stringify(from.scope) !== JSON.stringify(to.scope)) return; const previous = layout; try { const plan = planMove(layout, from.scope, from.itemId, to.itemId); if (!plan) return; setLayout(plan.nextLayout); if (plan.moved.isNew) return; setSaving(true); await writer.mutateAsync({ mutation: rankMutation(layout, plan.moved, scopePath(from.scope, plan.moved), plan.nextRank), moduleKey, viewKey }); toast.success("Order saved."); } catch (error) { setLayout(previous); toast.error(error.message || "Order could not be saved."); } finally { setSaving(false); } };
  const blocks = layout?.blocks || []; const shownBlocks = search.trim() ? blocks.filter((x) => JSON.stringify(x).toLowerCase().includes(search.trim().toLowerCase())) : blocks; const root = { type: "block" };
  return <div className="flex min-h-[680px] flex-col overflow-hidden rounded-xl border border-border bg-background"><header className="flex items-center justify-between border-b border-border px-5 py-4"><div><div className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">{title}</h2><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">Layout</span></div><p className="mt-1 text-sm text-muted-foreground">Configure visibility and ordering for tabs, sections and fields.</p></div><div className="flex items-center gap-2">{saving && <span className="text-xs font-medium text-primary">Saving...</span>}<button type="button" onClick={reset} disabled={!layout || saving} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-40"><RotateCcw className="h-4 w-4" />Reset</button></div></header>
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(340px,1fr)_minmax(360px,470px)]"><section className="flex min-h-0 flex-col border-b border-border bg-card lg:border-b-0 lg:border-r"><div className="border-b border-border p-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tabs, sections or fields..." className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/50" /></div></div><div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">{query.isPending && <p className="py-16 text-center text-sm text-muted-foreground">Loading layout...</p>}{query.error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{query.error.message}</p>}{layout && <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={shownBlocks.map((x) => idFor(root, x))} strategy={verticalListSortingStrategy}><div className="space-y-3">{shownBlocks.map((item) => <SortableNode key={idFor(root, item)} item={item} scope={root} layout={layout} selected={selection} disabled={saving || Boolean(search.trim())} onSelect={(scope, node) => setSelection({ scope, itemId: nodeKey(node) })} onToggle={toggle} onAdd={(type, scope) => setAddRequest({ type, scope })} />)}</div></SortableContext></DndContext>}</div></section><aside className="min-h-0 overflow-y-auto bg-background"><Inspector selection={selection} item={selectedItem} busy={saving} onToggle={toggle} onAdd={(type, scope) => setAddRequest({ type, scope })} /></aside></div><AddDialog request={addRequest} onClose={() => setAddRequest(null)} onSubmit={addNode} /></div>;
}
