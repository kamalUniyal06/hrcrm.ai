import { LeaveProvider, useLeave } from "../context/LeaveContext";
import ApplyLeaveForm from "../components/leave/ApplyLeaveForm";
import LeaveOverview from "../components/leave/LeaveOverview";
import "../components/leave/LeaveManagement.css";

function LeaveContent() {
    const { view } = useLeave();
    return (
        <div className="leave-page">
            {view === "apply" ? <ApplyLeaveForm /> : <LeaveOverview />}
        </div>
    );
}
export default function LeaveManagementPage() {
    return (
        <LeaveProvider>
            <LeaveContent />
        </LeaveProvider>
    );
}
