import { Pie, PieChart, ResponsiveContainer } from "recharts";
import { useLeave } from "../../context/LeaveContext";

function BalanceSkeleton() {
  return (
    <article className="balance-card balance-card--skeleton">
      <div className="balance-chart-skeleton">
        <div className="skeleton-circle" />
      </div>

      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--text" />
    </article>
  );
}

export default function LeaveBalances() {
  const { balances, leaveBalanceIsLoading } = useLeave();

  return (
    <section className="leave-section">
      <div className="leave-section__heading">
        <div>
          <span className="eyebrow">YOUR BALANCE</span>
          <h2>Available leave</h2>
        </div>
      </div>

      <div className="balance-grid">
        {leaveBalanceIsLoading ? (
          <>
            <BalanceSkeleton />
            <BalanceSkeleton />
          </>
        ) : (
          balances.map((item) => {
            const available = Number(item.available || 0);
            const total = Number(item.total || 0);
            const hasBalance = available > 0 && total > 0;

            return (
              <article className="balance-card" key={item.type}>
                {hasBalance ? (
                  <div className="balance-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { value: available },
                            {
                              value: Math.max(total - available, 0),
                            },
                          ]}
                          dataKey="value"
                          innerRadius={33}
                          outerRadius={43}
                          startAngle={90}
                          endAngle={-270}
                          stroke="none"
                          fill={`var(--leave-${item.tone})`}
                          isAnimationActive={false}
                        />

                        <Pie
                          data={[{ value: total }]}
                          dataKey="value"
                          innerRadius={43}
                          outerRadius={44}
                          fill="var(--leave-track)"
                          stroke="none"
                          isAnimationActive={false}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <strong>
                      {String(available).padStart(2, "0")}
                    </strong>
                  </div>
                ) : (
                  <div className="balance-empty">
                    <span>No days available</span>
                  </div>
                )}

                <h3>{item.type}</h3>

                <span>
                  {hasBalance
                    ? `${available} of ${total} days remaining`
                    : "No leave available"}
                </span>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
