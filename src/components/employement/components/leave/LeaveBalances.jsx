import { Pie, PieChart, ResponsiveContainer } from "recharts";
import { useLeave } from "../../context/LeaveContext";

export default function LeaveBalances() {
  const { balances } = useLeave();
  return (
    <section className="leave-section">
      <div className="leave-section__heading">
        <div>
          <span className="eyebrow">YOUR BALANCE</span>
          <h2>Available leave</h2>
        </div>
      </div>
      <div className="balance-grid">
        {balances.map((item) => (
          <article className="balance-card" key={item.type}>
            <div className="balance-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { value: item.available },
                      { value: Math.max(item.total - item.available, 0) },
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
                    data={[{ value: item.total }]}
                    dataKey="value"
                    innerRadius={43}
                    outerRadius={44}
                    fill="var(--leave-track)"
                    stroke="none"
                    isAnimationActive={false}
                  />
                </PieChart>
              </ResponsiveContainer>
              <strong>{String(item.available).padStart(2, "0")}</strong>
            </div>
            <h3>{item.type}</h3>
            <span>
              {item.available} of {item.total} days remaining
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
