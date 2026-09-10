import { AlarmClock, Clock3, LogIn, LogOut } from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import TodayAttendanceCard from "../components/TodayAttendanceCard";
import MetricCard from "../components/MetricCard";
import AttendanceSummary from "../components/AttendanceSummary";
import TeamTable from "../components/TeamTable";
import WorkingHistory from "../components/WorkingHistory";
import "../components/EmployeeDashboard.css";

export default function EmployeHomePage() {
    return (
        <main className="employee-dashboard">
            <DashboardHeader />
            <div className="employee-dashboard__overview">
                <TodayAttendanceCard />
                <MetricCard icon={Clock3} label="Average hours" value="7h 17mins" />
                <MetricCard icon={LogIn} label="Average check-in" value="10:33 AM" />
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
            <div className="employee-dashboard__tables">
                <TeamTable />
                <WorkingHistory />
            </div>
        </main>
    );
}
