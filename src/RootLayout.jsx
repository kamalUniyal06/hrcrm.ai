import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";
import { useContext, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import DisplayIntro from "./components/DisplayIntro";
import Footer from "./components/Footer";
import { PageContext } from "./context/pageContext";
import { useCandidateProfile } from "./queries/candidate.queries";




const RootLayout = () => {

  const { setActivePage, displayIntro } = useContext(PageContext)
  const location = useLocation().pathname.split("/")[2];
  const pathname = useLocation().pathname;
  const mainRef = useRef(null);
  const { data: candidate } = useCandidateProfile();
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

  if (displayIntro) {
    return <DisplayIntro key="intro" />;
  }

  return (
    <div className="flex h-screen bg-background ">

      {/* LEFT */}
      {hasCandidate && <Sidebar />}


      {/* RIGHT */}
      <div className="flex flex-1 flex-col overflow-hidden p-2">
        {/* <Breadcrumbs /> */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto hide-scrollbar w-full"
        >
          {/* Top Navigation */}
          <TopNav sidebarAvailable={hasCandidate} />



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
