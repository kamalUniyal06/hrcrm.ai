import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";
import { useContext, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import DisplayIntro from "./components/DisplayIntro";
import Footer from "./components/Footer";
import { PageContext } from "./context/pageContext";
import { useCandidateProfile } from "./queries/candidate.queries";
import Profile from "./components/pages/Profile";
import LoadingPage from "./components/pages/LoadingPage";
import { needsOnboarding, rememberOnboardingComplete, rememberOnboardingStarted } from "./components/pages/profile/onboardingState";

const RootLayout = () => {
  const { setActivePage, displayIntro, setDisplayIntro } =
    useContext(PageContext);
  const location = useLocation().pathname.split("/")[2];
  const pathname = useLocation().pathname;
  const mainRef = useRef(null);
  const {
    data: candidate,
    isPending,
    isError,
    refetch,
  } = useCandidateProfile();
  const [onboarding, setOnboarding] = useState(null);
  const navigate = useNavigate();
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
    if (mainRef.current) {
      mainRef.current.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
      mainRef.current.scrollLeft = 0;
    }
  }, [pathname]);

  useEffect(() => {
    setActivePage(location);
  }, [location, setActivePage]);

  if (onboarding === null) {
    if (isError) {
      return <div className="grid min-h-screen place-items-center bg-[#faf9f6] p-6"><div role="alert" className="text-center text-sm text-slate-500"><p>We couldn’t load your profile.</p><button onClick={() => refetch()} className="mt-4 rounded-full bg-slate-900 px-6 py-3 text-white">Try again</button></div></div>;
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
          navigate("/profile", { replace: true });
        }}
      />
    );
  }

  if (displayIntro) {
    return <DisplayIntro key="intro" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-sidebar-primary">
      {/* LEFT */}
      {hasCandidate && <Sidebar />}

      {/* RIGHT */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-sidebar-primary">
        {/* The navigation and sidebar intentionally share the same shell colour. */}
        <div className="shrink-0 px-2 py-1.5 sm:px-3">
          <TopNav sidebarAvailable={hasCandidate} />
        </div>

        {/* One inset surface keeps every routed page visually attached to the shell. */}
        <main
          ref={mainRef}
          className="hide-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-tl-2xl rounded-tr-2xl bg-background shadow-[0_-1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(15,23,42,0.12)] sm:rounded-tl-3xl"
        >
          <div className="flex min-h-full w-full flex-col px-3 pb-16 pt-3 sm:px-4 sm:pt-4">
            <div className="flex min-h-0 flex-1 flex-col">
              <Outlet />
            </div>
          </div>
        </main>
        {/* <Footer /> */}
      </div>
    </div>
  );
};

export default RootLayout;
