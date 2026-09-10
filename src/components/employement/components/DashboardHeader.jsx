import { store } from "@/store/store";
import { Clock3 } from "lucide-react";

export default function DashboardHeader() {
  const now = new Date();
  const currentHour = now.getHours();

  const getGreeting = () => {
    if (currentHour >= 5 && currentHour < 12) {
      return "Good morning";
    }

    if (currentHour >= 12 && currentHour < 17) {
      return "Good afternoon";
    }

    if (currentHour >= 17 && currentHour < 21) {
      return "Good evening";
    }

    return "Good night";
  };

  const formattedDate = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  const formattedTime = now.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <header className="employee-dashboard__top">
      <div>
        <h1>
          {getGreeting()}, {store.getState().user.user?.name}
        </h1>

        <p className="employee-dashboard__subtitle">
          You have 2 leave request pending.
        </p>
      </div>

      <div className="current-time">
        <div>
          <span className="current-time__label">
            Current Time :
          </span>

          <strong>
            {formattedDate} - {formattedTime}
          </strong>
        </div>

        <Clock3 size={25} />
      </div>
    </header>
  );
}