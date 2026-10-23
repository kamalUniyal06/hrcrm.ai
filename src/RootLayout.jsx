import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Outlet, useLocation } from "react-router-dom";
import DisplayIntro from "./components/DisplayIntro";
import Footer from "./components/Footer";
import { PageContext } from "./context/pageContext";
import { useCandidateProfile } from "./queries/candidate.queries";
import Profile from "./components/pages/Profile";
import LoadingPage from "./components/pages/LoadingPage";
import {
  needsOnboarding,
  rememberOnboardingComplete,
  rememberOnboardingStarted,
} from "./components/pages/profile/onboardingState";
import IncrementReminder from "./components/employement/components/IncrementReminder";
import { SystemAlertsProvider } from "./components/employement/components/alerts/SystemAlertsProvider";
import { resetPageScroll } from "./utils/resetPageScroll";
import HalloweenDecor from "./components/halloween/HalloweenDecor";

const RootLayout = () => {
  const { setActivePage, displayIntro, setDisplayIntro } =
    useContext(PageContext);
  const route = useLocation();
  const location = route.pathname.split("/")[2];
  const subjectType = useSelector((state) => state.user.userInfo?.subject_type);
  const showFooter = subjectType !== "candidate";
  const mainRef = useRef(null);
  const {
    data: candidate,
    isPending,
    isError,
    refetch,
  } = useCandidateProfile();
  const [onboarding, setOnboarding] = useState(null);
  // Latch the decision: parsing or saving an intermediate step must not open the shell.
  useEffect(() => {
    if (!isPending && !isError && onboarding === null) {
      const required = needsOnboarding(candidate);
      if (required) rememberOnboardingStarted(candidate);
      setOnboarding(required);
    }
  }, [candidate, isPending, isError, onboarding]);
  const hasCandidate = Boolean(candidate?.id);
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);
  useLayoutEffect(() => {
    resetPageScroll(mainRef.current);
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [route.key, onboarding, displayIntro]);

  useEffect(() => {
    setActivePage(location);
  }, [location, setActivePage]);

  if (onboarding === null) {
    if (isError) {
      return (
        <div className="grid min-h-screen place-items-center bg-[#faf9f6] p-6">
          <div role="alert" className="text-center text-sm text-slate-500">
            <p>We couldn’t load your profile.</p>
            <button
              onClick={() => refetch()}
              className="mt-4 rounded-full bg-slate-900 px-6 py-3 text-white"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return <LoadingPage />;
  }

  if (onboarding) {
    return (
      <Profile
        standalone
        onComplete={(saved) => {
          rememberOnboardingComplete(saved);
          setDisplayIntro(false);
          try {
            localStorage.setItem("displayIntro", "false");
          } catch {
            /* Storage may be unavailable. */
          }
          setOnboarding(false);
          window.location.replace("/");
        }}
      />
    );
  }

  if (displayIntro) {
    return <DisplayIntro key="intro" />;
  }

  // The alerts provider owns the alert popup, which also answers the logout check.
  return (
    <SystemAlertsProvider>
    <div className="flex h-dvh overflow-hidden bg-sidebar-primary">
      {/* LEFT */}
      {hasCandidate && <Sidebar />}

      {/* RIGHT */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-sidebar-primary">
        {/* The navigation and sidebar intentionally share the same shell colour. */}
        <div className="shrink-0 px-2 py-1.5 sm:px-3">
          <TopNav sidebarAvailable={hasCandidate} />
        </div>

        {/* The page fills the remaining shell space; visible footers reserve their own height. */}
        <main
          ref={mainRef}
          className="hide-scrollbar relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-tl-2xl rounded-tr-2xl bg-background shadow-[0_-1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(15,23,42,0.12)] sm:rounded-tl-3xl"
        >
          <div
            className="flex min-h-full w-full flex-col px-3 pb-6 pt-3 sm:px-4 sm:pt-4"
          >
            <div className="flex flex-1 flex-col">
              <Outlet />
            </div>
          </div>
        </main>
        {showFooter && <Footer />}
      </div>
    </div>
    {/* Shows in season, to the audience set by VITE_SHOW_HALLOWEEN_THEME. */}
    <HalloweenDecor />
    </SystemAlertsProvider>
  );
};

export default RootLayout;
