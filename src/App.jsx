import { useEffect } from "react";

import { SettingsPage } from "./components/pages/settingpages/SettingsPage";
import { useDispatch, useSelector } from "react-redux";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import RootLayout from "./RootLayout";

import { getUser, userAction } from "./store/Slices/userSlice";
import Login from "./components/pages/Login";
import LoadingPage from "./components/pages/LoadingPage";
import { toast, ToastContainer } from "react-toastify";

import ErrorBoundary from "./components/ErrorBoundary";

import NotFoundPage from "./components/pages/NotFoundPage";

import Profile from "./components/pages/Profile";
import JobPost from "./components/pages/JobPost";
import JobApplication from "./components/pages/JobApplication";
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
          <RootLayout />
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
        element: <DynamicEntityHandler mode="list" />,
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
        element: <DynamicEntityHandler mode="list" />,
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
        element: <DynamicEntityHandler mode="detail" />,
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
        element: <DynamicEntityHandler mode="create" />,
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
        element: <DynamicEntityHandler mode="edit" />,
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
