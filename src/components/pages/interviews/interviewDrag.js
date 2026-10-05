import { candidateIdentity, clean, hasOutcome, roundName } from "./interviewUtils.js";

// A drop prepares the feedback form. Only the form's save action writes to CRM.
export function roundDropAction(record, destination) {
  if (!record?.id || !candidateIdentity(record) || hasOutcome(record) || String(record.deleted) === "1" || !clean(destination)) return null;
  const targetRound = roundName({ description: destination });
  if (targetRound.toLowerCase() === roundName(record).toLowerCase()) return null;
  return { record, action: "Pass", targetRound };
}

// One arrow key selects an adjacent visible round on both board orientations.
export function roundKeyboardCoordinates(event, { context }) {
  const direction = ["ArrowRight", "ArrowDown"].includes(event.code) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.code) ? -1 : 0;
  if (!direction || !context.collisionRect) return;
  event.preventDefault();
  const rounds = context.droppableContainers.getEnabled()
    .filter((container) => container.data.current?.type === "interview-round")
    .sort((a, b) => a.data.current.group.index - b.data.current.group.index);
  const current = context.over?.id || `round:${context.active?.data.current?.group.key}`;
  const index = rounds.findIndex((container) => container.id === current);
  if (index < 0) return;
  const target = rounds[index + direction];
  const rect = target && context.droppableRects.get(target.id);
  if (!rect) return;
  return {
    x: rect.left + (rect.width - context.collisionRect.width) / 2,
    y: rect.top + (rect.height - context.collisionRect.height) / 2,
  };
}
