import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
    CalendarCheck2,
    Clock3,
    History,
} from "lucide-react";

import { useLeave } from "../../context/LeaveContext";
import LeaveBalances from "./LeaveBalances";
import LeaveHeader from "./LeaveHeader";
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
        }, pageRef);

        return () => context.revert();
    }, []);

    useEffect(() => {
        const panel = pageRef.current?.querySelector("[data-leave-table]");
        if (!panel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        gsap.fromTo(panel, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
    }, [activeView]);

    return (
        <div ref={pageRef} className="min-w-0 text-[var(--leave-text)]">
            <div className="flex w-full flex-col gap-5 lg:gap-7">
                <div className="flex min-w-0 flex-col gap-5 lg:flex-row">
                    <div className="flex min-w-0 flex-1 flex-col gap-5">
                        <div data-leave-reveal className="min-w-0">
                            <LeaveHeader
                                onApply={() => setView("apply")}
                                onOpenApprovals={isAdmin ? () => navigate("/leave-approvals") : undefined}
                            />
                        </div>

                        <div data-leave-reveal className="flex min-w-0 flex-1 flex-col">
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
