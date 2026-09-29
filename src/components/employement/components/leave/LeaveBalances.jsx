import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useLeave } from "../../context/LeaveContext";

function BalanceSkeleton() {
  return (
    <div className="flex animate-pulse flex-col items-center justify-center py-5">
      <div className="h-20 w-20 rounded-full bg-[var(--leave-track)]" />
      <div className="mt-4 h-4 w-24 rounded bg-[var(--leave-track)]" /><div className="mt-2 h-3 w-32 rounded bg-[var(--leave-track)]" />
    </div>
  );
}

export default function LeaveBalances() {
  const { balances, leaveBalanceIsLoading } = useLeave();

  return (
    <section className="rounded-2xl border border-border bg-[var(--leave-surface)] px-5 py-6 shadow-sm sm:px-7">
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Your balance</span>
        <h2 className="mt-1 text-lg font-medium text-[var(--leave-text)]">Available leave</h2>
      </div>

      <div className="grid sm:grid-cols-2">
        {leaveBalanceIsLoading ? <><BalanceSkeleton /><BalanceSkeleton /></> : balances.map((item) => {
          const available = Number(item.available || 0);
          const total = Number(item.total || 0);
          const hasBalance = available > 0 && total > 0;
          const used = Math.max(total - available, 0);

          return (
            <article className="flex min-w-0 flex-col items-center justify-center px-4 py-4 text-center sm:min-h-40 sm:border-r sm:border-border sm:last:border-r-0" key={item.type}>
              <div className="relative h-24 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={hasBalance ? [{ value: available }, { value: used }] : [{ value: 1 }]} dataKey="value" innerRadius={34} outerRadius={43} startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
                      <Cell fill={hasBalance ? `var(--leave-${item.tone})` : "var(--leave-track)"} />
                      {hasBalance && <Cell fill="var(--leave-track)" />}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <strong className="absolute inset-0 grid place-items-center text-2xl text-[var(--leave-text)]">{String(available).padStart(2, "0")}</strong>
              </div>
              <div className="mt-2 min-w-0"><h3 className="truncate text-sm font-medium text-[var(--leave-text)]">{item.type}</h3><p className="mt-1 text-[10px] text-[var(--leave-muted)]">{hasBalance ? `${available} of ${total} days remaining` : "No days available"}</p></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
