import { Menu, X } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { PageContext } from "../context/pageContext";

const INDIA_TIME_ZONE = "Asia/Kolkata";

function formatIndiaTime(date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function IndiaClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const delay = 1000 - (Date.now() % 1000);
    let interval;
    const alignTimer = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 1000);
    }, delay);

    return () => {
      window.clearTimeout(alignTimer);
      if (interval) window.clearInterval(interval);
    };
  }, []);

  const day = new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA_TIME_ZONE,
    weekday: "long",
  }).format(now);

  return (
    <div
      aria-label={`India time: ${formatIndiaTime(now)} IST`}
      className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white shadow-sm backdrop-blur-sm"
    >
      <div className="text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-white/70">
        India · IST
      </div>
      <span aria-hidden="true" className="h-3.5 w-px bg-white/25" />
      <time dateTime={now.toISOString()} className="text-sm font-semibold leading-none tabular-nums tracking-tight">
        {formatIndiaTime(now)}
      </time>
      <div className="text-[10px] font-medium leading-none text-white/70">
        {day}, UTC+5:30
      </div>
    </div>
  );
}

export function TopNav({ sidebarAvailable = true }) {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useContext(PageContext);

  return (
    <header
      data-tour="top-nav"
      className="sticky top-0 z-[999] flex min-h-10 w-full min-w-0 items-center rounded-xl border border-transparent bg-transparent p-1"
    >
      {sidebarAvailable && (
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          aria-label={mobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={Boolean(mobileSidebarOpen)}
          aria-controls="app-sidebar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 active:scale-90 lg:hidden"
        >
          {mobileSidebarOpen ? (
            <X size={20} strokeWidth={2.2} />
          ) : (
            <Menu size={20} strokeWidth={2.2} />
          )}
        </button>
      )}
      <div className="ml-auto">
        <IndiaClock />
      </div>
    </header>
  );
}
