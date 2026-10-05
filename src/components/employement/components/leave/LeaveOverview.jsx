import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
    ArrowRight,
    CalendarCheck2,
    Clock3,
    History,
    Palmtree,
} from "lucide-react";

import { useLeave } from "../../context/LeaveContext";
import LeaveBalances from "./LeaveBalances";
import UpcomingHolidays from "./UpcomingHolidays";
import LeaveApplications from "./LeavesApplications";
import LeaveHistory from "./LeaveHistory";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const views = [
    { id: "applications", label: "Applications", icon: <Clock3 size={16} /> },
    { id: "history", label: "Leave history", icon: <History size={16} /> },
];

export default function LeaveOverview() {
    const { setView } = useLeave();
    const pageRef = useRef(null);
    const [activeView, setActiveView] = useState("applications");
    const isAdmin = useSelector((state) => state.user.userInfo?.status === "admin");
    const navigate = useNavigate();
    useEffect(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion) return undefined;

        const context = gsap.context(() => {
            gsap.from("[data-leave-reveal]", {
                y: 28,
                opacity: 0,
                duration: 0.75,
                stagger: 0.09,
                ease: "power3.out",
            });
            gsap.to("[data-leave-orbit='one']", {
                x: 18,
                y: -14,
                rotation: 8,
                duration: 4.5,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
            });
            gsap.to("[data-leave-orbit='two']", {
                x: -14,
                y: 18,
                rotation: -10,
                duration: 5.5,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
            });
        }, pageRef);

        return () => context.revert();
    }, []);

    useEffect(() => {
        const panel = pageRef.current?.querySelector("[data-leave-table]");
        if (!panel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        gsap.fromTo(panel, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
    }, [activeView]);

    return (
        <div ref={pageRef} className="relative isolate min-h-screen overflow-hidden bg-[var(--leave-page)] px-3 py-4 text-[var(--leave-text)] sm:px-5 sm:py-6 lg:px-7">
            <div data-leave-orbit="one" className="pointer-events-none absolute -right-20 top-8 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div data-leave-orbit="two" className="pointer-events-none absolute -left-24 top-80 -z-10 h-64 w-64 rounded-full bg-[var(--leave-green)]/15 blur-3xl" />

            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 lg:gap-7">
                <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start">
                    <div className="flex min-w-0 flex-1 flex-col gap-5">
                        <section data-leave-reveal className="relative overflow-hidden rounded-2xl border border-border bg-[var(--leave-blue-soft)] shadow-sm">
                            <div className="flex min-h-[210px] flex-col justify-between gap-7 px-6 py-7 sm:px-8 xl:flex-row xl:items-center xl:px-10">
                                <div className="max-w-xl">
                                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Take a breath</div>
                                    <h1 className="text-2xl font-medium tracking-[-0.02em] text-[var(--leave-text)]">Need a Break?</h1>
                                    <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--leave-muted)]">Submit your leave request in just a few clicks. Whether it’s a vacation, sick day, or personal time off, we’ve got you covered.</p>
                                    <button type="button" onClick={() => setView("apply")} className="group mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                        Apply for Leave <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                                    </button>
                                    {isAdmin && (
                                        <button type="button" onClick={() => navigate("/leave-approvals")} className="inline-flex ml-2 items-center gap-2 rounded-xl border border-border bg-[var(--leave-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--leave-text)] shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md">
                                            Open leave approvals
                                        </button>
                                    )}
                                </div>
                                <div className="flex shrink-0 justify-center lg:w-56">
                                    <div className="flex h-36 w-36 flex-col items-center justify-center rounded-[45%_25%_45%_30%] bg-primary/5 text-primary sm:h-40 sm:w-40">
                                        <Palmtree size={68} strokeWidth={1.8} />
                                        <span className="mt-2 text-[9px] font-bold uppercase tracking-[0.18em]">Rest · Reset · Return</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div data-leave-reveal className="min-w-0">
                            <LeaveBalances />
                        </div>
                    </div>

                    <div data-leave-reveal className="min-w-0 lg:w-[360px] lg:shrink-0">
                        <UpcomingHolidays />
                    </div>
                </div>

                <section data-leave-reveal className="min-w-0 overflow-hidden rounded-[2rem] border border-border bg-[var(--leave-surface)] shadow-xl shadow-primary/5">
                    <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                <CalendarCheck2 size={15} /> Your time-off workspace
                            </div>
                            <h2 className="text-2xl font-semibold tracking-tight text-[var(--leave-text)] sm:text-3xl">
                                {activeView === "applications" ? "Leave applications" : "Leave history"}
                            </h2>
                            <p className="mt-1 text-sm text-[var(--leave-muted)]">
                                {activeView === "applications" ? "Review active requests and their latest status." : "Browse the complete record of your time away."}
                            </p>
                        </div>

                        <nav aria-label="Leave records" className="grid grid-cols-2 rounded-2xl bg-[var(--leave-page)] p-1">
                            {views.map(({ id, label, icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    aria-current={activeView === id ? "page" : undefined}
                                    onClick={() => setActiveView(id)}
                                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${activeView === id ? "bg-primary text-primary-foreground shadow-md" : "text-[var(--leave-muted)] hover:bg-[var(--leave-surface)] hover:text-[var(--leave-text)]"}`}
                                >
                                    {icon} {label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div key={activeView} data-leave-table className="min-w-0 p-3 sm:p-5">
                        {activeView === "applications" ? <LeaveApplications /> : <LeaveHistory />}
                    </div>
                </section>
            </div>
        </div>
    );
}
