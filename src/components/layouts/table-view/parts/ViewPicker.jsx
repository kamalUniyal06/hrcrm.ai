import React, { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import { groupTableViews, viewId } from "@/utils/tableViewRegistry";

export default function ViewPicker({ views = [], loading, moduleKey, viewKey, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const activeId = viewId(moduleKey, viewKey);
  const selected = views.find((view) => view.id === activeId);
  const groups = useMemo(() => groupTableViews(views), [views]);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" role="combobox" aria-expanded={open} aria-label="Table view"
          disabled={disabled || (loading && !views.length)}
          className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 sm:w-72">
          <span className="truncate">{selected?.label || (moduleKey ? moduleKey : loading ? "Loading views..." : "Choose a table view")}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6}
          className="z-[100] w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <Command>
            <Command.Input placeholder="Search views..." aria-label="Search table views"
              className="h-11 w-full border-b border-border bg-transparent px-3 text-sm outline-none" />
            <Command.List className="max-h-80 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">No matching table views.</Command.Empty>
              {groups.map((group) => (
                <Command.Group key={group.groupName} heading={group.groupName}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
                  {group.views.map((view) => (
                    <Command.Item key={view.id} value={view.id}
                      keywords={[view.label, view.groupName]}
                      onSelect={() => { onSelect(view); setOpen(false); }}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm data-[selected=true]:bg-accent">
                      <span>{view.label}</span>
                      {view.id === activeId && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
