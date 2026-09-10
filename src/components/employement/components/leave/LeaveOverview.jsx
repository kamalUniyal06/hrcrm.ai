import { ArrowRight, Palmtree } from "lucide-react";
import { useLeave } from "../../context/LeaveContext";
import LeaveBalances from "./LeaveBalances";
import UpcomingHolidays from "./UpcomingHolidays";
import LeaveHistory from "./LeaveHistory";
export default function LeaveOverview() {
    const { setView } = useLeave();
    return (
        <>
            <header className="leave-top">
                <div>
                    <span className="eyebrow">TIME OFF</span>
                    <h1>Leave</h1>
                    <p>Plan your time away and track every request.</p>
                </div>
            </header>
            <div className="leave-layout">
                <main>
                    <section className="leave-hero">
                        <div>
                            <span className="eyebrow">TAKE A BREATH</span>
                            <h2>Need a Break?</h2>
                            <p>
                                Submit your leave request in just a few clicks. Whether it’s a
                                vacation, sick day, or personal time off, we’ve got you covered.
                            </p>
                            <button
                                className="primary-button"
                                onClick={() => setView("apply")}
                            >
                                Apply for Leave <ArrowRight size={16} />
                            </button>
                        </div>
                        <div className="hero-art">
                            <Palmtree size={72} />
                            <span>REST • RESET • RETURN</span>
                        </div>
                    </section>
                    <LeaveBalances />
                </main>
                <UpcomingHolidays />
            </div>
            <LeaveHistory />
        </>
    );
}
