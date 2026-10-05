import ApplyLeaveForm from "../components/leave/ApplyLeaveForm";
import LeaveOverview from "../components/leave/LeaveOverview";
import { LeaveProvider, useLeave } from "../context/LeaveContext";
import "../components/leave/LeaveManagement.css";

function EmployeeLeaveContent() {
  const { view } = useLeave();


  return (
    <div className="leave-page">

      {view === "apply" ? <ApplyLeaveForm /> : <LeaveOverview />}
    </div>
  );
}

export default function EmployeeLeavePage() {
  return <LeaveProvider><EmployeeLeaveContent /></LeaveProvider>;
}
