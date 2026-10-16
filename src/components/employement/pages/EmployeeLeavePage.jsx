import ApplyLeaveForm from "../components/leave/ApplyLeaveForm";
import LeaveOverview from "../components/leave/LeaveOverview";
import { LeaveProvider, useLeave } from "../context/LeaveContext";
import "../components/leave/LeaveManagement.css";
import { pageGutter } from "../components/home/homeUi";

function EmployeeLeaveContent() {
  const { view } = useLeave();


  return (
    <div className="leave-page leave-page--flush">
      <div className={pageGutter}>
        {view === "apply" ? <ApplyLeaveForm /> : <LeaveOverview />}
      </div>
    </div>
  );
}

export default function EmployeeLeavePage() {
  return <LeaveProvider><EmployeeLeaveContent /></LeaveProvider>;
}
