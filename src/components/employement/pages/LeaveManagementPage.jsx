import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function LeaveManagementPage() {
  const isAdmin = useSelector((state) => state.user.userInfo?.status === "admin");
  return <Navigate replace to={isAdmin ? "/leave-approvals" : "/my-leaves"} />;
}
