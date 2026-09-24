import { LeaveProvider, useLeave } from "../context/LeaveContext";
import ApplyLeaveForm from "../components/leave/ApplyLeaveForm";
import LeaveOverview from "../components/leave/LeaveOverview";
import "../components/leave/LeaveManagement.css";
import { useSelector } from "react-redux";
import AdminLeaveNews from "../components/leave/AdminLeaveNews";

function LeaveContent() {
    const { view } = useLeave();
    return (
        <div className="leave-page">
            {view === "apply" ? <ApplyLeaveForm /> : <LeaveOverview />}
        </div>
    );
}
export default function LeaveManagementPage() {
    const isAdmin = useSelector((state) => state.user.userInfo?.status === "admin");
    if (isAdmin) return <div className="leave-page"><AdminLeaveNews /></div>;
    return (
        <LeaveProvider>
            <LeaveContent />
        </LeaveProvider>
    );
}
