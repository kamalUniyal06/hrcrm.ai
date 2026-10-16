import AdminLeaveBoard from "../components/leave/admin/AdminLeaveBoard";
import "../components/leave/LeaveManagement.css";
import { pageGutter } from "../components/home/homeUi";

export default function AdminLeavePage() {
  return <div className="leave-page leave-page--flush"><div className={pageGutter}><AdminLeaveBoard /></div></div>;
}
