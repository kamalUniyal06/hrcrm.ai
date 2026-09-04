import { useEffect } from "react";
import { TimelinePage } from "./components/pages/TimelinePage";
import { UnrepliedEmailsPage } from "./components/pages/UnrepliedEmailsPage";
import { Marketplace } from "./components/pages/Marketplace";
import { RecentEntry } from "./components/pages/RecentEntry";
import { Duplicate } from "./components/pages/DuplicatePage";
import { TagManagerpage } from "./components/pages/TagManagerpage";
import { InvoicesPage } from "./components/pages/InvoicesPage";
import { SettingsPage } from "./components/pages/settingpages/SettingsPage";
import { useDispatch, useSelector } from "react-redux";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import RootLayout from "./RootLayout";
import { AiCreditsPage } from "./components/pages/AiCreditsPage";
import { PageContextProvider } from "./context/pageContext";
import { getUser, userAction } from "./store/Slices/userSlice";
import Login from "./components/pages/Login";
import LoadingPage from "./components/pages/LoadingPage";
import { toast, ToastContainer } from "react-toastify";
import { MachineLearningPage } from "./components/pages/settingpages/MachineLearningPage";
import { PaypalCredentials } from "./components/pages/settingpages/PaypalCredentialsPage";
import TemplatesPage from "./components/pages/settingpages/TemplatesPage";
import WebsitesPage from "./components/pages/settingpages/WebsitesPage";
import { UsersPage } from "./components/pages/settingpages/UsersPage";
import Contactpage from "./components/pages/Contactpage";
import { ForwardedPage } from "./components/pages/ForwardedPage";
import { FavouritePage } from "./components/pages/FavouritePage";
import ErrorBoundary from "./components/ErrorBoundary";
import ButtonPage from "./components/pages/settingpages/ButtonPage";
import { DefaulterPage } from "./components/pages/Defaulterpage";
import { OtherPage } from "./components/pages/OtherPage";
import NotFoundPage from "./components/pages/NotFoundPage";
import AvatarPage from "./components/pages/AvatarPage";
import { MovedPage } from "./components/pages/MovedEmails";
import { SocketContextProvider } from "./context/SocketContext";
import { BacklinksPage } from "./components/pages/BacklinksPage";
import { ReminderPage } from "./components/pages/ReminderPage";
import { LinkExchangePage } from "./components/pages/LinkExchangePage";
import { HotPage } from "./components/pages/HotPage";
import ViewReports from "./components/ViewReports";
import GpcControllerPage from "./components/pages/GpcControllerPage";
import ConsoleHandler from "./components/ConsoleHandler";
import PromptTestingPage from "./components/pages/settingpages/PromptTestingPage";
import ThreadReply from "./components/pages/threads/ThreadReply";
import ThreadView from "./components/pages/threads/ThreadView";
import { ThreadContextProvider } from "./context/ThreadContext";
import Debug from "./components/pages/settingpages/Debug";
import Thread from "./components/pages/threads/Thread";
import SelfTest from "./components/pages/settingpages/SelfTest";
import DynamicRouteHandler from "./components/routing/DynamicRouteHandler";
import GroupReport from "./components/pages/GroupReport";
import PromptExplorer from "./components/pages/settingpages/PromptExplorer";
import Ip from "./components/Ip";
import IpManager from "./components/pages/IpManager";
import DataModellingPage from "./components/pages/settingpages/DataModellingPage";
import UserActivity from "./components/pages/settingpages/UserActivity";
import RecyclePage from "./components/pages/settingpages/Recycle";
import Profile from "./components/pages/Profile";
import OutBox from "./components/pages/OutBox";
import RedirectHandler from "./components/pages/RedirectHandler";
import { Toaster } from "react-hot-toast";
import ReminderManagementPage from "./components/pages/ReminderManagement";
import { TimelineProvider } from "./context/TimelineContext";
import MeetingWidget from "./components/MeetingWidget";
// import TwakChat from "./components/TwakTo";
import BootApp from "./components/BootApp";
import Recharge from "./components/pages/Recharge";
import PlansPage from "./components/pages/PlansPage";
import BillingSettings from "./components/pages/BillingSettings";
import InternetStatus from "./components/InternetStatus";
import DynamicEntityHandler from "./components/routing/DynamicEntityHandler";
import Theme from "./components/theme/Theme";
import Layout from "./components/layouts/Layout";
import Sidebar from "./components/layouts/sidebar/Sidebar";
import Views from "./components/layouts/detail-view/Views";
import CreateView from "./components/layouts/create-view/CreateView";
import TableView from "./components/layouts/table-view/TableView";
import { LinkRemovalPage } from "./components/pages/LinkRemovalpage";
import LinkRemovalDetailPage from "./components/pages/LinkRemovalDetailPage";
import InternalChats from "./components/pages/internal-chats/InternalChats";
import { store } from "./store/store";
import Home from "./components/Home";

const router = createBrowserRouter([
  {
    path: "*",
    element: <NotFoundPage />,
  },
  {
    path: "/",
    element: (
      <ErrorBoundary>
        <ThreadContextProvider>
          <PageContextProvider>
            <TimelineProvider>
              <SocketContextProvider>
                <BootApp />
                <RootLayout />
              </SocketContextProvider>
            </TimelineProvider>
          </PageContextProvider>
        </ThreadContextProvider>
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
        path: "unreplied-emails",
        element: <UnrepliedEmailsPage />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "ai-credits",
        element: <AiCreditsPage />,
      },
      {
        path: "recharge",
        element: <Recharge />,
      },
      {
        path: "plans",
        element: <PlansPage />,
      },

      {
        path: "tag-manager",
        element: <TagManagerpage />,
      },

      {
        path: "contacts/:id?",
        element: <Contactpage />,
      },
      {
        path: "console",
        element: <ConsoleHandler />,
      },
      {
        path: "redirect",
        element: <RedirectHandler />,
      },

      {
        path: "Marketplace",
        element: <Marketplace />,
      },

      {
        path: "RecentEntry",
        element: <RecentEntry />,
      },
      {
        path: "duplicates",
        element: <Duplicate />,
      },

      {
        path: ":type",
        element: <Outlet />,

        handle: {
          breadcrumb: ({ params }) => params.type,
        },

        children: [
          {
            index: true,
            element: <DynamicRouteHandler mode="list" />,
          },

          {
            path: "view",
            element: <DynamicRouteHandler mode="list" />,
            handle: {
              breadcrumb: "View",
            },
          },

          {
            path: "create",
            element: <DynamicRouteHandler mode="create" />,
            handle: {
              breadcrumb: "Create",
            },
          },

          {
            path: "edit",
            element: <DynamicRouteHandler mode="edit" />,
            handle: {
              breadcrumb: "Edit",
            },
          },
        ],
      },
      {
        path: "invoices",
        element: <InvoicesPage />,
      },
      {
        path: "link-exchange",
        element: <LinkExchangePage />,
      },

      {
        path: "reminders/:id?",
        element: <ReminderPage />,
      },

      {
        path: "view-reports",
        element: <ViewReports />,
      },
      {
        path: "view-reports/:category",
        element: <GroupReport />,
      },

      {
        path: "timeline",
        element: <TimelinePage />,
      },
      {
        path: "outbox",
        element: <OutBox />,
      },
      {
        path: "ip",
        element: <Ip />,
      },
      {
        path: "ip-manager",
        element: <IpManager />,
      },

      {
        path: "forwarded-emails",
        element: <ForwardedPage />,
      },
      {
        path: "favourite-emails",
        element: <FavouritePage />,
      },
      {
        path: "market-place",
        element: <Marketplace />,
      },
      {
        path: "default-report",
        element: <DefaulterPage />,
      },
      {
        path: "moved-emails",
        element: <MovedPage />,
      },

      {
        path: "other",
        element: <OtherPage />,
      },
      {
        path: "avatars",
        element: <AvatarPage />,
      },
      {
        path: "hot-records",
        element: <HotPage />,
      },
      {
        path: "reminder-management",
        element: <ReminderManagementPage />,
      },
      {
        path: "internal-chats",
        element: <InternalChats />,
      },
      {
        path: "thread",
        element: <Thread />,
        children: [
          {
            path: "view",
            element: <ThreadView />,
          },
          {
            path: "reply",
            element: <ThreadReply />,
          },
        ],
      },
      {
        path: "settings",
        element: <SettingsPage />,
        children: [
          {
            path: "machine-learning",
            element: <MachineLearningPage />,
          },
          {
            path: "paypal-credentials",
            element: <PaypalCredentials />,
          },
          {
            path: "templates",
            element: <TemplatesPage />,
          },
          {
            path: "websites",
            element: <WebsitesPage />,
          },
          {
            path: "users",
            element: <UsersPage />,
          },
          {
            path: "billing/:tab?",
            element: <BillingSettings />,
          },
          {
            path: "buttons",
            element: <ButtonPage />,
          },
          {
            path: "controller",
            element: <GpcControllerPage />,
          },
          {
            path: "prompt-testing",
            element: <PromptTestingPage />,
          },
          {
            path: "prompt-explorer",
            element: <PromptExplorer />,
          },
          {
            path: "debugging",
            element: <Debug />,
          },
          {
            path: "self-test",
            element: <SelfTest />,
          },
          {
            path: "data-modelling",
            element: <DataModellingPage />,
          },
          {
            path: "user-activity",
            element: <UserActivity />,
          },
          {
            path: "recycle",
            element: <RecyclePage />,
          },
          {
            path: "backlinks",
            element: <BacklinksPage />,
          },
          {
            path: "theme",
            element: <Theme />,
          },

          /* ================================================================
             LAYOUT
             ================================================================ */

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
  console.log("isAuthenticatedz", store.getState().user.user?.email);
  useEffect(() => {
    if (isAuthenticated) {
      import("./lib/tinymce");
    }
  }, [isAuthenticated]);
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    const email = searchParams.get("email");

    // Only allow email param when URL has no extra path
    const isOnlyDomain =
      window.location.pathname === "/" || window.location.pathname === "";

    if (isOnlyDomain && email) {
      dispatch(getUser(email));
    } else {
      dispatch(getUser());
    }
  }, [dispatch]);

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

      {isAuthenticated && !loading && (
        <>
          {/* <MeetingWidget /> */}
          {/* <TwakChat /> */}
          <RouterProvider router={router} />
        </>
      )}
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
