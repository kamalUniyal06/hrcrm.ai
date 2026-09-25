import { useSelector } from "react-redux";

export default function DashboardHeader() {
  const user = useSelector((state) => state.user.user?.name);

  const currentHour = new Date().getHours();

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

  return (
    <header className="flex w-full items-center justify-between gap-5">
      <div className="min-w-0">
        <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
          {getGreeting()}, {user || "User"}
        </h1>

        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Here&apos;s your attendance overview for today.
        </p>
      </div>
    </header>
  );
}