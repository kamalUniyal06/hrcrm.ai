/** Right-hand inspector for a status stat. */

import React from "react";

import { CircleDotDashed, Info } from "lucide-react";

import IconInput from "@/components/IconInput";
import Icon from "@/components/ui/Icon/Icon";

import {
  Badge,
  ReadOnlyValue,
  Section,
  SwitchRow,
} from "./Primitives";

function StatusIcon({ status }) {
  if (!status.icon?.name || !status.icon?.library) {
    return <CircleDotDashed className="h-5 w-5 text-muted-foreground" />;
  }

  return (
    <Icon
      name={status.icon?.name}
      library={status.icon?.library}
      color={status.icon?.color || status.color || undefined}
      className="h-5 w-5"
      fallback={<CircleDotDashed className="h-5 w-5 text-muted-foreground" />}
    />
  );
}

export default function StatusInspector({
  status,
  onToggleVisible,
  onSetIcon,
  busy,
}) {
  const visibleEntry = status.presentation?.visible;
  const iconEntry = status.presentation?.icon;

  const iconValue =
    status.icon?.library && status.icon?.name
      ? { library: status.icon.library, name: status.icon.name }
      : null;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/30">
            <StatusIcon status={status} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Status stat
            </p>

            <h3 className="mt-1 truncate text-base font-semibold text-foreground">
              {status.label}
            </h3>

            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {status.key}
            </p>
          </div>

          {!status.visible && <Badge tone="warning">hidden</Badge>}
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
        <div className="space-y-6">
          <Section
            title="Presentation"
            description="Saved as overrides on this view. No new revision is published."
          >
            <div className="space-y-3">
              <SwitchRow
                title="Show this status stat"
                description={
                  visibleEntry?.writable
                    ? "Controls whether this status stat is displayed in the table view."
                    : "Flexibility returned no mutation for this value, so it cannot be changed here."
                }
                checked={status.visible}
                disabled={!visibleEntry?.writable}
                busy={busy}
                onChange={() => onToggleVisible(status)}
              />

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Icon
                </label>

                <IconInput
                  value={iconValue}
                  onChange={(selection) => onSetIcon(status, selection)}
                  placeholder="Choose an icon"
                  disabled={!iconEntry?.writable || busy}
                  className="[&>div]:w-full"
                />

                <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                  {iconEntry?.writable
                    ? "Selecting or removing an icon saves immediately."
                    : "Flexibility returned no mutation for this value."}
                </p>
              </div>

              <ReadOnlyValue
                label="Rank"
                value={status.rank}
                mono
                hint="Drag the status in the list to change its opaque ordering rank."
              />
            </div>
          </Section>

          <Section
            title="Override records"
            description="Storage details supplied by the returned contract."
          >
            <div className="overflow-hidden rounded-xl border border-border">
              {["visible", "icon", "rank"].map((kind) => {
                const entry = status.presentation?.[kind];

                return (
                  <div
                    key={kind}
                    className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
                  >
                    <span className="w-14 shrink-0 text-xs font-medium capitalize text-foreground">
                      {kind}
                    </span>

                    {entry?.writable ? (
                      <>
                        <Badge
                          tone={
                            entry.mutation.action === "update"
                              ? "success"
                              : "primary"
                          }
                        >
                          {entry.mutation.action}
                        </Badge>

                        <span
                          className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground"
                          title={
                            entry.mutation.data?.property_path ||
                            `record ${entry.recordId}`
                          }
                        >
                          {entry.mutation.data?.property_path ??
                            entry.recordId ??
                            "—"}
                        </span>
                      </>
                    ) : (
                      <span className="flex-1 text-[10px] text-muted-foreground">
                        Not writable on this view.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-2 flex gap-1.5 text-[10px] leading-4 text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                A create mutation becomes an update mutation after the first
                successful save and contract refresh.
              </span>
            </p>
          </Section>

          <Section
            title="Status definition"
            description="Read-only values owned by the published configuration."
          >
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyValue label="Label" value={status.label} />
              <ReadOnlyValue label="Amount field" value={status.amountKey} mono />
              <ReadOnlyValue label="Show amount" value={status.showAmount ? "Yes" : "No"} />
              <ReadOnlyValue label="Color" value={status.color} mono />
            </div>

            <div className="mt-3">
              <ReadOnlyValue
                label="Filters"
                value={JSON.stringify(status.filters)}
                mono
              />
            </div>
          </Section>

          <Section
            title="Published definition"
            description="Exactly what the compiler returned for this status stat."
          >
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <pre className="custom-scrollbar max-h-64 overflow-auto text-[10px] leading-5 text-muted-foreground">
                {JSON.stringify(status.definition, null, 2)}
              </pre>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
