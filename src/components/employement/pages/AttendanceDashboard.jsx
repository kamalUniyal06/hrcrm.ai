import React from "react";
import { useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
    AttendanceProvider,
} from "../context/AttendanceContext";

import EmployeeAttendanceCalendar from "../components/attendance/EmployeeAttendanceCalendar";
import AdminAttendanceDashboard from "../components/attendance/AdminAttendanceDashboard";

const AttendanceDashboard = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { userInfo, user } = useSelector(
        (state) => state.user
    );

    const isAdmin = userInfo?.status === "admin";
    const showAdminAsEmployee = isAdmin && searchParams.get("view") === "mine";
    const email = user?.email || userInfo?.email1 || userInfo?.email;

    return (
        <AttendanceProvider>
            {isAdmin && !showAdminAsEmployee ? (
                <AdminAttendanceDashboard
                    onViewMyAttendance={() => setSearchParams({ view: "mine" })}
                />
            ) : (
                <div className="space-y-4">
                    {showAdminAsEmployee && (
                        <button
                            type="button"
                            onClick={() => navigate("/attendance")}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                        >
                            <ArrowLeft size={16} />
                            Back to admin attendance
                        </button>
                    )}
                    <EmployeeAttendanceCalendar email={email} />
                </div>
            )}
        </AttendanceProvider>
    );
};

export default AttendanceDashboard;
