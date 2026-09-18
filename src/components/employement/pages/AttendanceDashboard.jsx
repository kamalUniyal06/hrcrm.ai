import React from "react";
import { useSelector } from "react-redux";

import {
    AttendanceProvider,
} from "../context/AttendanceContext";

import EmployeeAttendanceCalendar from "../components/attendance/EmployeeAttendanceCalendar";
import AdminAttendanceDashboard from "../components/attendance/AdminAttendanceDashboard";

const AttendanceDashboard = () => {
    const { userInfo, user } = useSelector(
        (state) => state.user
    );

    const isAdmin = userInfo?.status === "admin";

    ;

    return (
        <AttendanceProvider>
            {isAdmin ? (
                <AdminAttendanceDashboard />
            ) : (
                <EmployeeAttendanceCalendar
                    email={user?.email}
                />
            )}
        </AttendanceProvider>
    );
};

export default AttendanceDashboard;