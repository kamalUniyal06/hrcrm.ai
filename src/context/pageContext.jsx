import { createContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { ladgerAction } from "../store/Slices/ladger";
import { toast } from "react-toastify";
const STORAGE_KEY = "emailSearchHistory";

export const PageContext = createContext();

export const PageContextProvider = (props) => {
  const [activePage, setActivePage] = useState("");
  const showConsole = true;
  const navigateTo = useNavigate();
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const [displayIntro, setDisplayIntro] = useState(
    localStorage.getItem("displayIntro") === "true",
  );
  const [showRefreshReminder, setShowRefreshReminder] = useState(false);

  const [collapsed, setSidebarCollapsed] = useState(true);

  /* Off-canvas sidebar (drawer) state — only used below the `lg` breakpoint */
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [showNextPrev, setShowNextPrev] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enteredEmail, setEnteredEmail] = useState(
    localStorage.getItem("searchTerm") || "",
  );

  const [superfastReply, setSuperfastReply] = useState(() => {
    const stored = localStorage.getItem("superfastreply");

    if (stored === null) {
      localStorage.setItem("superfastreply", "true"); // set default
      return true;
    }

    return stored === "true";
  });
  const superfastToggle = () => {
    setSuperfastReply((prev) => {
      const newValue = !prev;
      localStorage.setItem("superfastreply", newValue);
      return newValue;
    });
  };

  /* ❌ Clear */
  const handleClear = () => {
    localStorage.removeItem("searchTerm");
    setEnteredEmail("");
    setCurrentIndex(0);
    setShowNextPrev(true);
  };
  const handleDateClick = ({
    email,
    navigate = null,
    index = null,
    nextPrev = false,
  }) => {
    if (email == null) {
      toast.error("NO Email Is There!");
      return;
    }

    // SAVE SEARCH TERM
    localStorage.setItem("searchTerm", email);

    // SAVE SEARCH HISTORY
    const STORAGE_KEY = "emailSearchHistory";

    let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    // REMOVE DUPLICATES
    history = history.filter((item) => item.value !== email);

    // ADD NEW SEARCH
    history.unshift({
      value: email,
      time: new Date().toLocaleString(),
    });

    // KEEP ONLY LAST 3
    history = history.slice(0, 3);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

    // UPDATE STATE
    setEnteredEmail(email);

    dispatch(ladgerAction.setTimeline(null));

    if (index != null) {
      setCurrentIndex(index);
    }

    setShowNextPrev(nextPrev);

    if (navigate === "/" || navigate === "") {
      setActivePage("");
    }

    if (navigate != null) {
      navigateTo(navigate);
    }
  };
  const toggleMobileSidebar = () => {
    setMobileSidebarOpen((prev) => !prev);
  };

  // Set activePage based on current URL
  useEffect(() => {
    const path = window.location.pathname;
    const firstPart = path.split("/")[1];
    setActivePage(firstPart || "");
    setSidebarCollapsed(true);
    localStorage.setItem("showConsole", showConsole);
  }, []);
  useEffect(() => {
    localStorage.setItem("currentIndex", currentIndex);
  }, [currentIndex]);

  /* Close the mobile drawer whenever the route changes */
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);
  const value = {
    activePage,
    setActivePage,
    displayIntro,
    setDisplayIntro,
    handleClear,
    enteredEmail,
    setEnteredEmail,
    collapsed,
    superfastToggle,
    superfastReply,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    toggleMobileSidebar,
    handleDateClick,
    currentIndex,
    showNextPrev,
    setShowNextPrev,
    setCurrentIndex,
  };

  return (
    <PageContext.Provider value={value}>{props.children}</PageContext.Provider>
  );
};
