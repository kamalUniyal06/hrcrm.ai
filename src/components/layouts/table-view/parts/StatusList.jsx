/** Status-stat list with visibility controls and drag ordering. */

import React from "react";

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

import { CircleDotDashed, GripVertical, Loader2, Lock } from "lucide-react";

import Icon from "@/components/ui/Icon/Icon";

import { Badge, Toggle } from "./Primitives";

function StatusIcon({ status, className = "h-4 w-4" }) {
  if (!status.icon?.name || !status.icon?.library) {
    return <CircleDotDashed className={className} />;
  }

  return (
    <Icon
      name={status.icon?.name}
      library={status.icon?.library}
      color={status.icon?.color || status.color || undefined}
      className={className}
      fallback={<CircleDotDashed className={className} />}
    />
  );
}

function SortableStatus({
  status,
  selected,
  onSelect,
  onToggleVisible,
  busy,
  reorderDisabled,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: status.key,
    disabled: reorderDisabled,
    data: { type: "status", key: status.key },
  });

  const visibilityWritable = status.presentation?.visible?.writable;
  const rankWritable = status.presentation?.rank?.writable;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => onSelect(status)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(status);
        }
      }}
      className={`
        group
        flex
        cursor-pointer
        items-center
        gap-2
        rounded-lg
        border
        px-2
        py-2
        transition-colors

        ${
          selected
            ? "border-primary/40 bg-primary/[0.06]"
            : "border-transparent hover:bg-accent/60"
        }

        ${isDragging ? "opacity-50" : ""}
        ${status.visible ? "" : "opacity-60"}
      `}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(event) => event.stopPropagation()}
        disabled={reorderDisabled || !rankWritable}
        title={
          !rankWritable
            ? "This status position is not writable"
            : reorderDisabled
              ? "Reordering is unavailable right now"
              : `Drag to move ${status.label}`
        }
        aria-label={`Drag to move ${status.label}`}
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
          disabled:cursor-not-allowed
          disabled:opacity-30
          disabled:hover:bg-transparent
        "
      >
        {rankWritable ? (
          <GripVertical className="h-3.5 w-3.5" />
        ) : (
          <Lock className="h-3 w-3" />
        )}
      </button>

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <StatusIcon status={status} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium text-foreground">
            {status.label}
          </span>

          {!status.visible && <Badge tone="warning">hidden</Badge>}
        </div>

        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
          {status.key}
        </p>
      </div>

      <span
        className="w-14 shrink-0 truncate text-right font-mono text-[9px] text-muted-foreground"
        title={status.rank ? `rank ${status.rank}` : "no rank"}
      >
        {status.rank ?? "—"}
      </span>

      {busy ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      ) : (
        <Toggle
          checked={status.visible}
          disabled={!visibilityWritable}
          onChange={() => onToggleVisible(status)}
          label={`Show ${status.label} status stat`}
        />
      )}
    </div>
  );
}

const collisionDetectionStrategy = (args) =>
  closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => container.data?.current?.type === "status",
    ),
  });

export default function StatusList({
  statuses,
  allStatuses,
  selection,
  onSelect,
  onToggleVisible,
  onMove,
  busyStatusKey,
  reorderDisabled,
  searching,
}) {
  const [dragging, setDragging] = React.useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const dragDisabled = reorderDisabled || searching;

  const handleDragEnd = ({ active, over }) => {
    setDragging(null);

    if (!over || active.id === over.id) {
      return;
    }

    const destinationIndex = allStatuses.findIndex(
      (status) => status.key === over.id,
    );

    if (destinationIndex !== -1) {
      onMove(active.id, destinationIndex);
    }
  };

  if (!statuses.length) {
    return (
      <p className="px-2 py-8 text-center text-xs text-muted-foreground">
        {searching
          ? "No status stat matches the current search."
          : "This view has no status stats."}
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={({ active }) => setDragging(active.data.current)}
      onDragCancel={() => setDragging(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={statuses.map((status) => status.key)}
        strategy={verticalListSortingStrategy}
        disabled={dragDisabled}
      >
        <div className="space-y-0.5">
          {statuses.map((status) => (
            <SortableStatus
              key={status.key}
              status={status}
              selected={
                selection?.type === "status" && selection?.key === status.key
              }
              onSelect={onSelect}
              onToggleVisible={onToggleVisible}
              busy={busyStatusKey === status.key}
              reorderDisabled={dragDisabled}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {dragging?.key ? (
          <div className="rounded-lg border border-primary/30 bg-card px-3 py-2 shadow-xl">
            <p className="font-mono text-xs font-medium text-foreground">
              {dragging.key}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
