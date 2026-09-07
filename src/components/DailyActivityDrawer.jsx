import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion as Motion } from "framer-motion";
import { Clock3, Coffee, LogOut, Play, X } from "lucide-react";
import { getActivitySnapshot, subscribeActivity, recordActivity } from "../services/dailyActivity";

const labels = { login: "Logged in", lunch_in: "Lunch started", lunch_out: "Back from lunch", logout: "Logged out" };
const duration = (ms) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((n) => String(n).padStart(2, "0")).join(":");
};
const time = (at) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function DailyActivityDrawer({ user, profileImage, onClose, onLogout }) {
  const activity = useSyncExternalStore(subscribeActivity, getActivitySnapshot);
  const session = activity.email === user?.email ? activity.session : null;
  const [now, setNow] = useState(Date.now);
  const [leaving, setLeaving] = useState(false);
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.focus();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); previous?.focus(); };
  }, []);
  const lunch = session?.action === "lunch_in";
  const ended = session?.action === "logout";
  const elapsed = session ? (ended ? session.changedAt : now) - session.startedAt : 0;
  const lunchMs = (session?.lunchMs || 0) + (lunch ? now - session.changedAt : 0);
  const busy = activity.pending || leaving;
  const act = async (action) => { try { await recordActivity(user.email, action); } catch { /* Inline error keeps the action retryable. */ } };
  const signOut = async () => { setLeaving(true); try { await onLogout(); } finally { setLeaving(false); } };
  const onKeyDown = (event) => {
    if (event.key === "Escape") onClose();
    if (event.key !== "Tab") return;
    const controls = panel.current.querySelectorAll("button:not(:disabled)");
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <>
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9998] bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
    <Motion.aside ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="activity-title" onKeyDown={onKeyDown} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="fixed right-0 top-0 z-[9999] flex h-dvh w-full max-w-[420px] flex-col overflow-y-auto border-l border-border bg-background text-foreground shadow-2xl outline-none">
      <header className="flex items-center justify-between p-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Your daily rhythm</p><h2 id="activity-title" className="mt-1 text-xl font-semibold">Activity station</h2></div><button onClick={onClose} aria-label="Close activity" className="rounded-full p-2 hover:bg-accent"><X size={20} /></button></header>
      <div className="flex items-center gap-3 px-6 pb-6">{profileImage ? <img src={profileImage} alt="" className="h-12 w-12 rounded-2xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-lg font-bold text-violet-500">{(user?.name || user?.email || "U")[0].toUpperCase()}</div>}<div className="min-w-0"><p className="truncate font-semibold">{user?.name || "My workspace"}</p><p className="truncate text-xs text-muted-foreground">{user?.email}</p></div></div>
      <div className="mx-6 rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-medium"><span className={`h-2 w-2 rounded-full ${lunch ? "bg-amber-400" : session && !ended ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />{lunch ? "On lunch break" : ended ? "Session complete" : session ? "Logged in · Working" : "Login not recorded"}</span><Clock3 size={18} className="text-indigo-300" /></div>
        <p className="mt-8 text-xs text-indigo-200">{lunch ? "Time on this lunch break" : "Time since login"}</p><p className="mt-2 font-mono text-5xl tracking-tight tabular-nums">{duration(lunch ? now - session.changedAt : elapsed)}</p>
        <p className="mt-3 text-xs text-indigo-200">{session ? `Logged in at ${time(session.startedAt)}` : "Your activity will appear after login is recorded."}</p>
        <div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/15 pt-5"><div><p className="text-[10px] uppercase tracking-widest text-indigo-200">Working time</p><p className="mt-1 font-mono text-xl">{duration(elapsed - lunchMs)}</p></div><div><p className="text-[10px] uppercase tracking-widest text-indigo-200">Lunch time</p><p className="mt-1 font-mono text-xl">{duration(lunchMs)}</p></div></div>
      </div>
      <div className="p-6">
        {activity.error && <p role="alert" className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{activity.error}</p>}
        {!session ? <button disabled={busy} onClick={() => act("login")} className="w-full rounded-xl bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Recording login…" : "Retry login activity"}</button> : !ended && <div className="grid grid-cols-2 gap-3"><button disabled={busy || lunch} onClick={() => act("lunch_in")} className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-sm font-semibold disabled:opacity-40"><Coffee size={16} />Lunch in</button><button disabled={busy || !lunch} onClick={() => act("lunch_out")} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-sm font-semibold disabled:opacity-40"><Play size={16} />Lunch out</button></div>}
        <p role="status" className="mt-3 text-center text-xs text-muted-foreground">{busy ? "Saving your activity…" : lunch ? "Enjoy your break. Your lunch timer is running." : "Make room for focused work and a good break."}</p>
        <h3 className="mb-4 mt-8 text-xs font-bold uppercase tracking-widest text-muted-foreground">Session timeline</h3>
        <ol className="space-y-4">{session?.events?.map((event, index) => <li key={`${event.at}-${index}`} className="flex items-center gap-3 text-sm"><span className={`h-2 w-2 rounded-full ${event.action.startsWith("lunch") ? "bg-amber-400" : "bg-emerald-500"}`} /><span className="flex-1">{labels[event.action]}</span><time className="font-mono text-xs text-muted-foreground">{time(event.at)}</time></li>)}</ol>
      </div>
      <footer className="mt-auto border-t border-border p-6"><button disabled={busy} onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-3 text-sm font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"><LogOut size={16} />{leaving ? "Logging out…" : "Log out"}</button></footer>
    </Motion.aside>
  </>;
}
