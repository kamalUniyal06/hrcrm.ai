import { CalendarCheck2, CalendarPlus, Layers3, UsersRound } from "lucide-react";
import { cn } from "../../../lib/utils";

export default function InterviewStats({ total, scheduled, unscheduled, rounds, loading }) {
  const stats = [
    { label: "In the pipeline", value: total, detail: "Interviews across all rounds", Icon: UsersRound, featured: true },
    { label: "Scheduled", value: scheduled, detail: "Interview dates are set", Icon: CalendarCheck2 },
    { label: "To schedule", value: unscheduled, detail: "Waiting for a date & time", Icon: CalendarPlus },
    { label: "Interview rounds", value: rounds, detail: "Stages in your pipeline", Icon: Layers3 },
  ];

  return <dl className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4" aria-label="Interview summary" aria-busy={loading}>
    {stats.map((stat) => {
      const { label, value, detail, Icon, featured } = stat;
      return <div className={cn("rounded-xl border px-4 py-4 sm:px-5 sm:py-5", featured ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground")} key={label}>
      <dt className="flex items-center justify-between gap-2"><span className={cn("text-[11px] font-medium sm:text-xs", featured ? "text-primary-foreground/80" : "text-muted-foreground")}>{label}</span><span className={cn("grid size-8 shrink-0 place-items-center rounded-lg sm:size-9", featured ? "bg-primary-foreground/15 text-primary-foreground" : "bg-secondary text-secondary-foreground")} aria-hidden="true"><Icon size={19} strokeWidth={1.7} /></span></dt>
      <dd className="mt-0.5 mb-1 text-[32px] leading-tight font-medium tracking-[-.06em] tabular-nums sm:text-4xl">{loading ? <span className="opacity-50" aria-label="Loading">—</span> : value}</dd>
      <p className={cn("text-[10px] leading-relaxed sm:text-[11px]", featured ? "text-primary-foreground/75" : "text-muted-foreground")}>{detail}</p>
    </div>;
    })}
  </dl>;
}
