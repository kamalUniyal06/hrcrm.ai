import { AlarmClock, Clock3, LogIn, LogOut } from "lucide-react";
import { useSelector } from "react-redux";

import DashboardHeader from "../components/DashboardHeader";
import TodayAttendanceCard from "../components/TodayAttendanceCard";
import MetricCard from "../components/MetricCard";
import WorkingHistory from "../components/WorkingHistory";
import AttendanceSummary from "../components/AttendanceSummary";
import SystemAlertCarousel from "../components/SystemAlertCarousel";

export default function EmployeHomePage() {
    const employeeId = useSelector((state) => state.user.userInfo?.id);
    const email = useSelector((state) => state.user.user?.email);

    return (
        <main className="min-h-full w-full bg-background px-3 py-4 sm:px-5 lg:px-6">
            <div className="mx-auto w-full max-w-[1800px]">
                {/* Header */}
                <DashboardHeader />

                <SystemAlertCarousel employeeId={employeeId} email={email} />

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
                <div className="mt-5 grid grid-cols-1 gap-4">
                    {/* Working History */}
                    <div className="min-w-0">
                        <WorkingHistory email={email} />
                    </div>
                </div>
            </div>
        </main>
    );
}
