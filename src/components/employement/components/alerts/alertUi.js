import DOMPurify from "dompurify";
import he from "he";
import { BadgeCheck, CircleHelp, Info } from "lucide-react";

// Alert bodies are HTML, sometimes saved entity-encoded. Always render them sanitised.
export const sanitizeAlertHtml = (description) =>
  DOMPurify.sanitize(he.decode(String(description ?? "")), { USE_PROFILES: { html: true } }).trim();

// How each response type introduces itself to employees.
export const TYPE_META = {
  none: { icon: Info, chip: "For your information", prompt: "Read this update. Closing it marks it as seen.", action: "Read" },
  acknowledge: { icon: BadgeCheck, chip: "Please acknowledge", prompt: "Confirm that you have read this.", action: "Acknowledge" },
  yes_no: { icon: CircleHelp, chip: "Your answer needed", prompt: "Choose Yes or No to respond.", action: "Respond" },
};

export const typeMeta = (responseType) => TYPE_META[responseType] || TYPE_META.yes_no;

// Badge colours come from theme tokens so every theme keeps them readable.
export const TONE_CLASSES = {
  success: "border-[var(--attendance-present)]/30 bg-[var(--attendance-present)]/10 text-[var(--attendance-present)]",
  warning: "border-[var(--attendance-late)]/30 bg-[var(--attendance-late)]/10 text-[var(--attendance-late)]",
  danger: "border-[var(--attendance-absent)]/30 bg-[var(--attendance-absent)]/10 text-[var(--attendance-absent)]",
  info: "border-primary/20 bg-primary/10 text-primary",
  neutral: "border-border bg-card text-foreground",
  muted: "border-border bg-muted text-muted-foreground",
};

export const ANSWER_TONES = { yes: "success", no: "danger", acknowledged: "info", seen: "muted" };

export const badgeClass = (tone) =>
  `inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[tone] || TONE_CLASSES.neutral}`;
