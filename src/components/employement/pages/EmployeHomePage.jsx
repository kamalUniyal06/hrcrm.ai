import { AlarmClock, Clock3, LogIn, LogOut } from "lucide-react";
import { useSelector } from "react-redux";

import DashboardHeader from "../components/DashboardHeader";
import TodayAttendanceCard from "../components/TodayAttendanceCard";
import MetricCard from "../components/MetricCard";
import TeamTable from "../components/TeamTable";
import WorkingHistory from "../components/WorkingHistory";
import AttendanceSummary from "../components/AttendanceSummary";

export default function EmployeHomePage() {
    const isAdmin = useSelector(
        (state) => state.user.userInfo?.status === "admin"
    );

    return (
        <main className="min-h-full w-full bg-background px-3 py-4 sm:px-5 lg:px-6">
            <div className="mx-auto w-full max-w-[1800px]">
                {/* Header */}
                <DashboardHeader />

                {/* Overview */}
                <div className="mt-5 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
                    {/* Today's Attendance */}
                    <div className="min-w-0">
                        <TodayAttendanceCard />
                    </div>

                    {/* Compact metrics */}
                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:self-start">
                        <MetricCard
                            icon={Clock3}
                            label="Average hours"
                            value="7h 17mins"
                        />

                        <MetricCard
                            icon={LogIn}
                            label="Average check-in"
                            value="10:33 AM"
                        />

                        <MetricCard
                            icon={AlarmClock}
                            label="On-time arrival"
                            value="98.56 %"
                            tone="green"
                        />

                        <MetricCard
                            icon={LogOut}
                            label="Average check-out"
                            value="19:12 PM"
                            tone="orange"
                        />
                        <AttendanceSummary />
                    </div>
                </div>

                {/* Tables */}
                <div
                    className={`mt-5 grid grid-cols-1 gap-4 ${!isAdmin
                        ? "xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
                        : ""
                        }`}
                >
                    {/* Team */}
                    {!isAdmin && (
                        <div className="min-w-0">
                            <TeamTable />
                        </div>
                    )}

                    {/* Working History */}
                    <div className="min-w-0">
                        <WorkingHistory />
                    </div>
                </div>
            </div>
        </main>
    );
}
