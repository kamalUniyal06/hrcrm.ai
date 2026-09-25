import { createElement } from "react";

export default function MetricCard({
  icon,
  label,
  value,
  tone = "blue",
}) {
  const toneStyles = {
    blue: "bg-primary/10 text-primary",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <article className="flex min-h-[145px] flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneStyles[tone] || toneStyles.blue
          }`}
      >
        {createElement(icon, {
          size: 21,
          strokeWidth: 2,
        })}
      </div>

      <div className="mt-auto pt-6">
        <p className="text-sm font-medium text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
      </div>
    </article>
  );
}