// Shared Tailwind utilities using the theme tokens defined in src/index.css.
export const onboardingStyles = {
  surface: "rounded-[20px] border border-border bg-card text-card-foreground shadow-sm",
  input: "mt-2 min-h-11 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:outline-2 focus:outline-offset-2 focus:outline-primary focus:ring-4 focus:ring-primary/10 aria-invalid:border-destructive [&[readonly]]:bg-muted [&[readonly]]:text-muted-foreground motion-reduce:transition-none",
  primary: "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
  secondary: "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
  back: "inline-flex min-h-11 items-center gap-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary",
  label: "block text-sm font-medium",
  help: "mt-2 text-[13px] leading-normal text-muted-foreground",
  icon: "inline-flex size-12 shrink-0 items-center justify-center rounded-[14px] border border-border bg-accent text-primary",
  status: "inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium leading-snug whitespace-nowrap text-muted-foreground",
  display: "mt-4 text-[32px] leading-[1.12] font-semibold tracking-[-0.045em] sm:text-[44px] lg:text-[52px] [&>span]:text-primary",
  eyebrow: "inline-flex items-center gap-2 text-[13px] font-semibold text-primary",
  // Glassy eyebrow pill with a highlight badge as its first child.
  eyebrowPill: "inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/80 py-1 pr-3.5 pl-1 text-[13px] font-semibold text-primary shadow-sm backdrop-blur-sm",
  eyebrowBadge: "inline-flex items-center gap-1 rounded-full bg-highlight px-2 py-0.5 text-[11px] font-bold text-highlight-foreground",
  // Highlighter stroke behind a headline phrase; parent needs `relative isolate inline-block`.
  marker: "absolute inset-x-[-0.06em] bottom-[0.08em] -z-10 h-[0.32em] origin-left rounded-[0.12em] bg-highlight/55",
  // Light sweep across a primary button; the hover target needs `group/cta relative overflow-hidden`.
  shine: "pointer-events-none absolute inset-y-0 left-0 w-1/4 -translate-x-full -skew-x-12 bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-[500%] motion-reduce:hidden",
  inputIcon: "relative mt-2 [&>svg]:pointer-events-none [&>svg]:absolute [&>svg]:top-[22px] [&>svg]:left-[13px] [&>svg]:-translate-y-1/2 [&>svg]:text-muted-foreground [&>input]:mt-0 [&>input]:pl-[41px] [&>select]:mt-0 [&>select]:pl-[41px]",
  progressStep: "flex min-h-11 items-center gap-2 text-sm font-medium whitespace-nowrap text-muted-foreground hover:enabled:text-primary disabled:cursor-default group-aria-[current=step]:font-semibold group-aria-[current=step]:text-primary",
};
