import { useEffect } from "react";
import { SettingsPage } from "./components/pages/settingpages/SettingsPage";
import { useDispatch, useSelector } from "react-redux";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import RootLayout from "./RootLayout";
import RecruitmentProvider from "./context/RecruitmentProvider";

import { getUser, userAction } from "./store/Slices/userSlice";
import Login from "./components/pages/Login";
import LoadingPage from "./components/pages/LoadingPage";
import { toast, ToastContainer } from "react-toastify";

import ErrorBoundary from "./components/ErrorBoundary";

import NotFoundPage from "./components/pages/NotFoundPage";

import Profile from "./components/pages/Profile";
import JobPost from "./components/pages/JobPost";
import JobApplication from "./components/pages/JobApplication";
import CandidatesPage from "./components/pages/candidates/CandidatesPage";
import EmployeesPage from "./components/pages/employees/EmployeesPage";
import EmployeeProfilePage from "./components/pages/employees/EmployeeProfilePage";
import PoliciesPage from "./components/pages/policies/PoliciesPage";
import SalariesPage from "./components/pages/salaries/SalariesPage";
import PageAccessGuard from "./components/routing/PageAccessGuard";
import Interview from "./components/pages/Interview";
import { Toaster } from "react-hot-toast";

// import TwakChat from "./components/TwakTo";
import BootApp from "./components/BootApp";

import InternetStatus from "./components/InternetStatus";
import DynamicEntityHandler from "./components/routing/DynamicEntityHandler";
import Layout from "./components/layouts/Layout";
import Sidebar from "./components/layouts/sidebar/Sidebar";
import Views from "./components/layouts/detail-view/Views";
import CreateView from "./components/layouts/create-view/CreateView";
import TableView from "./components/layouts/table-view/TableView";

import Home from "./components/Home";
import { PageContextProvider } from "./context/pageContext";
import LeaveManagementPage from "./components/employement/pages/LeaveManagementPage";
import EmployeeLeavePage from "./components/employement/pages/EmployeeLeavePage";
import AdminLeavePage from "./components/employement/pages/AdminLeavePage";
import AttendanceDashboard from "./components/employement/pages/AttendanceDashboard";
import LeaveApplications from "./components/employement/components/leave/LeavesApplications";
import LimitManagementPage from "./components/pages/LimitManagementPage";
import OffboardingPage from "./components/employement/pages/OffboardingPage";
import SystemAlertsPage from "./components/employement/pages/SystemAlertsPage";
import QuotationsPage from "./components/pages/quotations/QuotationsPage";
import HolidaysPage from "./components/pages/holidays/HolidaysPage";
import IncrementRequestPage from "./components/employement/pages/IncrementRequestPage";
import IncrementManagementPage from "./components/employement/pages/IncrementManagementPage";
import OrgChartPage from "./components/pages/org/OrgChartPage";
import ReportingLinesPage from "./components/pages/org/ReportingLinesPage";
import RoleLadderPage from "./components/pages/org/RoleLadderPage";
import NotificationsPage from "./components/pages/notifications/NotificationsPage";
import HrAppointmentsPage from "./components/pages/hr-appointments/HrAppointmentsPage";
import TeamPage from "./components/pages/team/TeamPage";
import DepartmentPage from "./components/pages/department/DepartmentPage";
import { RequireScope } from "./components/routing/HrAccessGuard";

const router = createBrowserRouter([
  {
    path: "*",
    element: <NotFoundPage />,
  },
  {
    path: "/",
    element: (
      <ErrorBoundary>
        <PageContextProvider>
          <BootApp />
          <RecruitmentProvider><RootLayout /></RecruitmentProvider>
        </PageContextProvider>
      </ErrorBoundary>
    ),
    handle: {
      breadcrumb: "Timeline",
    },
    children: [
      {
        index: true,
        element: <Home />,
      },

      {
        path: "entity/:entity/list/:view",
        element: <PageAccessGuard><DynamicEntityHandler mode="list" /></PageAccessGuard>,
        handle: {
          breadcrumb: ({ params }) => [
            {
              label: params.entity,
              type: "entity",
            },
            {
              label: params.view,
              type: "view",
            },
          ],
        },
      },

      {
        path: "entity/:entity/view",
        element: <PageAccessGuard><DynamicEntityHandler mode="list" /></PageAccessGuard>,
        handle: {
          breadcrumb: ({ params }) => [
            {
              label: params.entity,
              type: "entity",
            },
            {
              label: "View",
              type: "view",
            },
          ],
        },
      },

      {
        path: "entity/:entity/:email",
        element: <PageAccessGuard><DynamicEntityHandler mode="detail" /></PageAccessGuard>,
        handle: {
          breadcrumb: ({ params }) => [
            {
              label: params.entity,
              type: "entity",
            },
            {
              label: params.email,
              type: "record",
            },
          ],
        },
      },

      {
        path: "entity/:entity/create",
        element: <PageAccessGuard><DynamicEntityHandler mode="create" /></PageAccessGuard>,
        handle: {
          breadcrumb: ({ params }) => [
            {
              label: params.entity,
              type: "entity",
            },
            {
              label: "Create",
              type: "action",
            },
          ],
        },
      },

      {
        path: "entity/:entity/:email/edit",
        element: <PageAccessGuard><DynamicEntityHandler mode="edit" /></PageAccessGuard>,
        handle: {
          breadcrumb: ({ params }) => [
            {
              label: params.entity,
              type: "entity",
            },
            {
              label: params.email,
              type: "record",
            },
            {
              label: "Edit",
              type: "action",
            },
          ],
        },
      },

      {
        path: "candidates",
        element: <PageAccessGuard><CandidatesPage key="candidates" /></PageAccessGuard>,
        handle: { breadcrumb: "Candidates" },
      },
      {
        path: "employees",
        element: <EmployeesPage />,
        handle: { breadcrumb: "Employees" },
      },
      {
        path: "employees/:employeeId",
        element: <PageAccessGuard><EmployeeProfilePage /></PageAccessGuard>,
        handle: { breadcrumb: "Employee profile" },
      },
      {
        path: "policies",
        element: <PoliciesPage />,
        handle: { breadcrumb: "Terms & policies" },
      },
      {
        path: "salaries",
        element: <PageAccessGuard><SalariesPage /></PageAccessGuard>,
        handle: { breadcrumb: "Salary management" },
      },
      {
        path: "limit-management",
        element: <PageAccessGuard><LimitManagementPage /></PageAccessGuard>,
        handle: { breadcrumb: "Limit management" },
      },
      {
        path: "limit-management/:recordId/edit",
        element: <PageAccessGuard><LimitManagementPage /></PageAccessGuard>,
        handle: { breadcrumb: "Edit limit record" },
      },
      {
        path: "attendance",
        element: <AttendanceDashboard key="candidates" />,
        handle: { breadcrumb: "Attendance" },
      },
      {
        path: "attendance/:employeeId",
        element: <AttendanceDashboard />,
        handle: { breadcrumb: "Employee attendance" },
      },
      {
        path: "exit",
        element: <PageAccessGuard><OffboardingPage /></PageAccessGuard>,
        handle: { breadcrumb: "Employee exit" },
      },
      {
        // Old links and bookmarks keep working.
        path: "offboarding",
        element: <Navigate to="/exit" replace />,
      },
      {
        path: "system-alerts",
        element: <PageAccessGuard><SystemAlertsPage /></PageAccessGuard>,
        handle: { breadcrumb: "System alerts" },
      },
      {
        path: "quotations",
        element: <PageAccessGuard><QuotationsPage /></PageAccessGuard>,
        handle: { breadcrumb: "Quotation alerts" },
      },
      {
        path: "holidays-management",
        element: <PageAccessGuard><HolidaysPage /></PageAccessGuard>,
        handle: { breadcrumb: "Public holidays" },
      },
      {
        path: "shortlisted",
        // Shortlisted candidates now live in the Candidates workspace.
        element: <Navigate to="/candidates?view=shortlisted" replace />,
        handle: { breadcrumb: "Shortlisted" },
      },
      {
        path: "interviews",
        element: <PageAccessGuard><Interview /></PageAccessGuard>,
        handle: { breadcrumb: "Interviews" },
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "job-posting",
        element: <JobPost />,
        handle: { breadcrumb: "Job postings" },
      },
      {
        path: "job-application",
        element: <JobApplication />,
        handle: { breadcrumb: "My applications" },
      },
      {
        path: "leaves",
        element: <LeaveManagementPage />,
      },
      {
        path: "my-leaves",
        element: <EmployeeLeavePage />,
        handle: { breadcrumb: "My leave" },
      },
      {
        path: "leave-approvals",
        element: <PageAccessGuard><AdminLeavePage /></PageAccessGuard>,
        handle: { breadcrumb: "Leave approvals" },
      },
      {
        path: "increment-request",
        element: <IncrementRequestPage />,
        handle: { breadcrumb: "Increment request" },
      },
      {
        path: "increment-management",
        element: <PageAccessGuard><IncrementManagementPage /></PageAccessGuard>,
        handle: { breadcrumb: "Increment management" },
      },
      {
        path: "/leave-applications",
        element: <LeaveApplications />,
      },
      {
        path: "org/chart",
        element: <PageAccessGuard><OrgChartPage /></PageAccessGuard>,
        handle: { breadcrumb: "Org chart" },
      },
      {
        path: "org/reporting",
        element: <PageAccessGuard><ReportingLinesPage /></PageAccessGuard>,
        handle: { breadcrumb: "Reporting lines" },
      },
      {
        path: "org/roles",
        element: <PageAccessGuard><RoleLadderPage /></PageAccessGuard>,
        handle: { breadcrumb: "Role ladder" },
      },
      // Every employee's own inbox and HR bookings: the backend serves them without an area grant.
      {
        path: "notifications",
        element: <NotificationsPage />,
        handle: { breadcrumb: "Notifications" },
      },
      {
        path: "hr-appointments",
        element: <HrAppointmentsPage />,
        handle: { breadcrumb: "HR appointments" },
      },
      // The HR Availability area opens here; the hours live on a tab of the appointments page.
      {
        path: "hr-appointments/availability",
        element: <Navigate to="/hr-appointments?tab=hours" replace />,
      },
      // Team leads and wider: the backend narrows `people` to the role's employees read scope.
      {
        path: "team",
        element: <RequireScope area="employees" action="read" min="team"><TeamPage /></RequireScope>,
        handle: { breadcrumb: "My team" },
      },
      // Department heads and wider: the backend checks each department against the employees read scope.
      {
        path: "department",
        element: <RequireScope area="employees" action="read" min="dept"><DepartmentPage /></RequireScope>,
        handle: { breadcrumb: "My department" },
      },


      {
        path: "settings",
        element: <SettingsPage />,
        children: [


          {
            path: "layout",
            element: <Layout />,
            children: [
              {
                index: true,
                element: <Sidebar />,
              },
              {
                path: "sidebar",
                element: <Sidebar />,
              },
              {
                path: "views",
                element: <Views />,
              },
              {
                path: "create-view",
                element: <CreateView />,
              },
              {
                path: "table-view",
                element: <TableView />,
              },
            ],
          },
        ],
      },
    ],
  },
]);
export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, error } = useSelector(
    (state) => state.user,
  );
  useEffect(() => {
    if (isAuthenticated) {
      import("./lib/tinymce");
    }
  }, [isAuthenticated]);
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    const job_id = searchParams.get("job_id");

    if (job_id?.trim()) {
      dispatch(getUser({ job_id }));
    } else {
      dispatch(getUser());
    }
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated || loading) return;
    const redirectJobLink = () => {
      if (router.state.navigation.state !== "idle") return;
      const { pathname, search } = router.state.location;
      if (new URLSearchParams(search).get("job_id")?.trim() && pathname !== "/profile") {
        void router.navigate({ pathname: "/profile", search }, { replace: true });
      }
    };
    redirectJobLink();
  }, [isAuthenticated, loading]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(userAction.clearAllErrors());
    }
  }, [dispatch, error]);

  return (
    <>
      <Toaster />
      <InternetStatus />

      {isAuthenticated && !loading && <RouterProvider router={router} />
      }
      {!isAuthenticated && loading && <LoadingPage />}

      {!isAuthenticated && !loading && <Login />}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </>
  );
}
