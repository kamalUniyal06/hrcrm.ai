/**
 * Which published view is being edited.
 *
 * The list is derived from the Sidebar global-component response, so it stays
 * in step with the app's own navigation instead of being a second hardcoded
 * registry. Modules switched off in the sidebar are flagged rather than
 * hidden: a hidden module still has a published table view whose columns
 * someone may need to fix before turning it back on.
 */

import React, { useMemo, useState } from "react";

import { AlertCircle, ChevronRight, Layers, Search } from "lucide-react";

import { Badge, EmptyState, LoadingBlock } from "./Primitives";

import { groupTableViews, viewId } from "@/utils/tableViewRegistry";

export default function ViewPicker({
  views,
  loading,
  error,
  moduleKey,
  viewKey,
  onSelect,
  unavailable,
}) {
  const [query, setQuery] = useState("");

  const activeId = viewId(moduleKey, viewKey);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = !needle
      ? views
      : (views ?? []).filter(
          (view) =>
            view.label?.toLowerCase().includes(needle) ||
            view.moduleKey?.toLowerCase().includes(needle) ||
            view.viewKey?.toLowerCase().includes(needle) ||
            view.groupName?.toLowerCase().includes(needle),
        );

    return groupTableViews(filtered);
  }, [query, views]);

  if (loading) {
    return <LoadingBlock label="Finding views..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not list views"
        description={
          error.message ||
          "The sidebar metadata could not be read, so the list of editable views is unavailable."
        }
      />
    );
  }

  if (!views?.length) {
    return (
      <EmptyState
        icon={Layers}
        title="No entity views found"
        description="No sidebar entry points at an entity list view, so there is nothing to edit here yet."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
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
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search views..."
            aria-label="Search views"
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

      {/* LIST */}

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {!groups.length && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No view matches "{query}".
          </p>
        )}

        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.groupName}>
              <p
                className="
                  mb-1.5
                  px-2
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-wider
                  text-muted-foreground
                "
              >
                {group.groupName}
              </p>

              <div className="space-y-1">
                {group.views.map((view) => {
                  const isActive = view.id === activeId;

                  const missing = unavailable?.has(view.id);

                  return (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() =>
                        onSelect({
                          moduleKey: view.moduleKey,
                          viewKey: view.viewKey,
                        })
                      }
                      aria-current={isActive ? "true" : undefined}
                      className={`
                        group
                        flex
                        w-full
                        items-center
                        gap-2
                        rounded-lg
                        px-2.5
                        py-2
                        text-left
                        transition-colors

                        ${
                          isActive
                            ? "bg-primary/10 ring-1 ring-primary/30"
                            : "hover:bg-accent/60"
                        }
                      `}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`
                              truncate
                              text-sm
                              font-medium
                              ${missing ? "text-muted-foreground" : "text-foreground"}
                            `}
                          >
                            {view.label}
                          </span>

                          {!view.sidebarActive && (
                            <Badge tone="neutral" title="Hidden in the sidebar">
                              hidden
                            </Badge>
                          )}

                          {missing && (
                            <Badge
                              tone="warning"
                              title="No published view under this key"
                            >
                              not published
                            </Badge>
                          )}
                        </div>

                        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                          {view.moduleKey}/{view.viewKey}
                        </p>
                      </div>

                      <ChevronRight
                        className={`
                          h-4
                          w-4
                          shrink-0
                          transition-opacity

                          ${
                            isActive
                              ? "text-primary opacity-100"
                              : "text-muted-foreground opacity-0 group-hover:opacity-60"
                          }
                        `}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
