import { createElement } from "react";

export default function MetricCard({ icon, label, value, tone = "blue" }) {
  return (
    <article className={`employee-card metric-card metric-card--${tone}`}>
      {createElement(icon, { size: 25 })}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
