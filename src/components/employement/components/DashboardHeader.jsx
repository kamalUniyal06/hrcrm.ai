import { Clock3 } from "lucide-react";

export default function DashboardHeader() {
  return (
    <header className="employee-dashboard__top">
      <div>
        <h1>Good afternoon, Sourav!</h1>
        <p className="employee-dashboard__subtitle">
          You have 2 leave request pending.
        </p>
      </div>
      <div className="current-time">
        <div>
          <span className="current-time__label">Current time</span>
          <strong>26 Sept 2023, 12:10 PM</strong>
        </div>
        <Clock3 size={25} />
      </div>
    </header>
  );
}
