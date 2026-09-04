import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { viewEmailAction } from "./store/Slices/viewEmail";
import { PageContext } from "./context/pageContext";
import DisplayIntro from "./components/DisplayIntro";
import WelcomeHeader from "./components/WelcomeHeader";
import Footer from "./components/Footer";
import { SocketContext } from "./context/SocketContext";
import { getDomain } from "./assets/assets";
import LowCreditWarning from "./components/LowCreditWarning";
import useRefresh from "./hooks/useRefresh";
import OnBoarding from "./components/OnBoarding";
import { useTimeline } from "./context/TimelineContext";
import toast from "react-hot-toast";
import { queryClient } from "./lib/queryClient"
import Breadcrumbs from "./components/Breadcrumbs";


const RootLayout = () => {
  const { message, error } = useSelector((state) => state.viewEmail);

  const { crmEndpoint, currentScore, } =
    useSelector((state) => state.user);
  const {
    displayIntro,
    setActivePage,
    collapsed,
  } = useContext(PageContext);
  const [showRechargeWarn, setShowRechargeWarn] = useState(Number(currentScore) <= 0)
  const { setCrm } = useContext(SocketContext);
  useTimeline()

  useRefresh();

  const dispatch = useDispatch();
  const location = useLocation().pathname.split("/")[2];
  const pathname = useLocation().pathname;


  const mainRef = useRef(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });

      /* Smooth scrolling can be interrupted mid-flight, which would leave a
         horizontal offset behind. Pin the inline axis synchronously. */
      mainRef.current.scrollLeft = 0;
    }
  }, [pathname]);

  useEffect(() => {
    if (crmEndpoint) {
      setCrm(getDomain(crmEndpoint));
    }
  }, [crmEndpoint]);


  useEffect(() => {
    if (message) {
      dispatch(viewEmailAction.clearAllMessage());
      toast.success(message, {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    }

    if (error) {
      dispatch(viewEmailAction.clearAllErrors());
      toast.error(error, {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    }
  }, [message, error]);

  // Set active page based on URL
  useEffect(() => {
    setActivePage(location);
  }, [location, setActivePage]);

  if (displayIntro) {
    return <DisplayIntro key="intro" />;
  }

  return (
    <div className="flex h-screen bg-background ">

      {/* LEFT */}
      <Sidebar />


      {/* RIGHT */}
      <div className="flex flex-1 flex-col overflow-hidden p-2">
        {/* <Breadcrumbs /> */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto hide-scrollbar w-full"
        >
          {/* Top Navigation */}
          <TopNav />



          <main
            ref={mainRef}
            className="
        min-h-0
        flex-1
        w-full
        overflow-y-auto
        overflow-x-hidden
        hide-scrollbar
        h-[100vh]
    "
          >
            <div className="flex min-h-full w-full flex-col">

              {/* Low credit warning */}

              <LowCreditWarning
                open={showRechargeWarn}
                score={currentScore}
                onClose={() => setShowRechargeWarn(false)}
              />

              {/* Page content */}

              <div className="m-3 flex min-h-0 flex-1 flex-col">
                <Outlet />
              </div>

            </div>
          </main>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default RootLayout;