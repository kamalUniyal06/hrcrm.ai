// Shared Tailwind class sets for the candidate-side screens (jobs, applications,
// interviews, profile). Every screen is: page header, summary strip, content.
// Dark green stays in the app shell; content areas stay light. Uses the theme tokens only.
export const candidateStyles = {
  page: "w-full space-y-6 px-1 pt-2 pb-8 text-foreground sm:px-3 sm:pt-4",
  card: "rounded-2xl border border-border bg-card text-card-foreground",
  eyebrow: "inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary",
  title: "mt-1.5 text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] sm:text-[30px]",
  lede: "mt-1.5 text-sm leading-6 text-muted-foreground",
  sectionTitle: "text-[17px] font-semibold tracking-tight",
  ghost: "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 motion-reduce:transition-none",
  iconButton: "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none",
  tile: "grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary",
  tag: "inline-flex max-w-full items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80",
  attentionText: "text-[var(--candidate-attention)]",
  attentionBox: "border-[var(--candidate-attention)]/25 bg-[var(--candidate-attention-soft)]",
};
