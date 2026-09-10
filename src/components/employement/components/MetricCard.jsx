export default function MetricCard({ icon: Icon, label, value, tone = "blue" }) {
  return <article className={`employee-card metric-card metric-card--${tone}`}><Icon size={25}/><span>{label}</span><strong>{value}</strong></article>;
}
