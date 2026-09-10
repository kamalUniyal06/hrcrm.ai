import { ChevronDown, ChevronRight, Radio, PanelLeft, X } from "lucide-react";
import Skeleton from "react-loading-skeleton";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { PageContext } from "../context/pageContext";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { userKeys } from "../queries/users.queries";
import { getAllUsers } from "../api/users.api";
import { logo, headingLogo } from "../assets/assets";
import Icon from "./ui/Icon/Icon";
import { useSidebarLayout, useSidebarStats } from "../queries/sidebar.queries";
import {
  normalizeSidebarResponse,
  selectVisibleGroups,
} from "../utils/sidebarLayout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { sidebarDestination } from "../utils/sidebarNavigation";

export function Sidebar() {
  const navigateTo = useNavigate();

  const {
    enteredEmail: email,
    activePage,
    setActivePage,
    collapsed: desktopCollapsed,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useContext(PageContext);

  /*
  |--------------------------------------------------------------------------
  | RESPONSIVE MODE
  |--------------------------------------------------------------------------
  | At `lg` and up the sidebar is a permanent, collapsible column.
  | Below `lg` it becomes an off-canvas drawer that is always shown in its
  | full (expanded) form, so `collapsed` is forced off there.
  */
  const isDesktop = useIsDesktop();
  const collapsed = isDesktop ? desktopCollapsed : false;
  const drawerOpen = !isDesktop && mobileSidebarOpen;

  /* Close the drawer on Escape */
  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, setMobileSidebarOpen]);

  /* Make sure the drawer never stays open once we cross into desktop */
  useEffect(() => {
    if (isDesktop && mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  }, [isDesktop, mobileSidebarOpen, setMobileSidebarOpen]);

  const [sidebarStatsQuery, setSidebarStatsQuery] = useState();
  const [expandedGroups, setExpandedGroups] = useState({});

  const {
    data: layoutData,
    isPending: layoutLoading,
    refetch: refetchLayout,
    error: layoutError,
  } = useSidebarLayout();

  const sidebarSections = layoutData ?? [];


  const { visibleGroups, rankReports } = useMemo(() => {
    const reports = [];

    const normalized = normalizeSidebarResponse(layoutData, {
      onInvalid: (report) => reports.push(report),
    });

    return {
      visibleGroups: selectVisibleGroups(normalized),
      rankReports: reports,
    };
  }, [layoutData]);

  const rankReloadAttempted = useRef(false);

  useEffect(() => {
    if (!rankReports.length) {
      rankReloadAttempted.current = false;
      return;
    }

    console.error(
      "[sidebar] invalid rank data, sidebar order cannot be trusted",
      rankReports,
    );

    if (rankReloadAttempted.current) {
      return;
    }

    rankReloadAttempted.current = true;

    refetchLayout?.();
  }, [rankReports, refetchLayout]);

  const { user } = useSelector((s) => s.user);

  const { data: usersData, isPending: usersPending } = useQuery({
    queryKey: userKeys.lists,
    queryFn: getAllUsers,
  });




  const [openSettingsCard, setOpenSettingsCard] = useState(false);
  const cardRef = useRef(null);

  // Close modal when clicked outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setOpenSettingsCard(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const { isPending: sidebarCountPending, data: sidebarCounts } =
    useSidebarStats({
      email,
      queries: sidebarStatsQuery,
    });

  /**
   * Keyed on the record id, not the group name. Names are
   * editable and can repeat; the id is what identifies a
   * group.
   */
  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  /**
   * Only keep:
   * 1. Groups where is_active === 1
   * 2. Items/fields where is_active === 1
   *
   * Empty groups are also removed because there is nothing
   * active to display inside them.
   */
  const activeSidebarGroups =
    sidebarSections?.data
      ?.filter((group) => Number(group.is_active) === 1)
      ?.map((group) => ({
        ...group,
        data: (group.data ?? []).filter((item) => Number(item.is_active) === 1),
      }))
      ?.filter((group) => group.data.length > 0) ?? [];

  useEffect(() => {
    if (!visibleGroups.length) return;

    setExpandedGroups(
      Object.fromEntries(visibleGroups.map((group) => [group.id, true])),
    );

    /**
     * Only ask for counts on fields that are actually
     * on screen.
     */
    setSidebarStatsQuery(
      visibleGroups.flatMap((group) =>
        (group.data ?? []).map((item) => ({
          key: item.key,
          module: item.module_name,
          ignore_email:
            item.filter_by_email == "1"
              ? false
              : true,
          filters: item.count_filters ?? {},
        })),
      ),
    );
  }, [visibleGroups]);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
            className="
              fixed inset-0 z-[1000]
              bg-black/50 backdrop-blur-[1px]
              lg:hidden
            "
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        id="app-sidebar"
        data-tour="sidebar"
        role={!isDesktop ? "dialog" : undefined}
        aria-modal={!isDesktop ? drawerOpen : undefined}
        aria-label="Main navigation"
        aria-hidden={!isDesktop && !drawerOpen}
        initial={false}
        animate={{
          width: collapsed ? 80 : 260,
          x: isDesktop || drawerOpen ? 0 : "-100%",
        }}
        transition={{
          duration: 0.25,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="
          fixed
          left-0
          top-0
          z-[1010]
          flex
          h-screen
          max-w-[85vw]
          flex-col
          overflow-hidden
          bg-gradient-to-b
          from-sidebar-primary
          from-0%
          via-sidebar-primary
          via-2%
          to-sidebar-secondary
          to-100%
          text-[var(--sidebar-primary-foreground)]
          shadow-2xl
          px-1

          lg:static
          lg:z-auto
          lg:max-w-none
          lg:shadow-none
        "
      >
        {layoutError ? <div role="alert" className="px-4 py-3 text-sm">Could not load sidebar.<button type="button" onClick={() => refetchLayout()} className="ml-2 underline">Retry</button></div> : layoutLoading ? (
          <div className="animate-pulse space-y-5 p-3">
            {[1, 2, 3].map((group) => (
              <div key={group}>
                {/* Group Header */}
                {!collapsed && (
                  <div className="mb-3 flex items-center justify-between px-3">
                    <div
                      className="
                        h-3 w-28 rounded
                        bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_10%,transparent)]
                      "
                    />

                    <div
                      className="
                        h-4 w-4 rounded
                        bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_10%,transparent)]
                      "
                    />
                  </div>
                )}

                {/* Group Items */}
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className={`flex items-center gap-3 p-2 ${collapsed ? "justify-center" : ""
                        }`}
                    >
                      {/* Icon */}
                      <div
                        className="
                          h-5 w-5 shrink-0 rounded-full
                          bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_10%,transparent)]
                        "
                      />

                      {!collapsed && (
                        <>
                          {/* Text */}
                          <div
                            className="
                              h-4 flex-1 rounded
                              bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_10%,transparent)]
                            "
                          />

                          {/* Count */}
                          <div
                            className="
                              h-5 w-8 rounded-full
                              bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_10%,transparent)]
                            "
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Logo */}
            <div
              className="
                mx-3 my-4 h-11 rounded-xl
                bg-background
                shadow
              "
            >
              <div className="group relative flex h-full items-center justify-center gap-3">
                <img
                  src={collapsed ? logo : headingLogo}
                  className={`
                    h-9 w-auto max-w-[160px]
                    cursor-pointer object-contain
                    transition-all duration-200
                    ${collapsed ? "group-hover:hidden" : ""}
                  `}
                  alt="App logo"
                  onClick={() => {
                    if (!isDesktop) setMobileSidebarOpen(false);
                    navigateTo("");
                  }}
                  draggable={false}
                />

                {/* Collapse / Expand Button — desktop only */}
                {isDesktop && (
                  <button
                    type="button"
                    aria-label={
                      collapsed ? "Expand sidebar" : "Collapse sidebar"
                    }
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    onClick={() => setSidebarCollapsed(!collapsed)}
                    className={`
                      flex h-7 w-7
                      items-center justify-center
                      rounded-full
                      shadow
                      cursor-pointer
                      transition-all duration-200
                      ${collapsed ? "hidden group-hover:flex" : "flex"}
                      bg-[var(--card)]
                    `}
                  >
                    <PanelLeft
                      className="h-5 w-5"
                      color="var(--sidebar-primary)"
                    />
                  </button>
                )}

                {/* Close Button — drawer only */}
                {!isDesktop && (
                  <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="
                      flex h-7 w-7
                      shrink-0
                      cursor-pointer
                      items-center justify-center
                      rounded-full
                      bg-[var(--card)]
                      shadow
                      transition-all
                      active:scale-90
                    "
                  >
                    <X className="h-5 w-5" color="var(--sidebar-primary)" />
                  </button>
                )}
              </div>
            </div>

            {/* LIVE BUTTON */}
            <button
              onClick={() => {
                if (!isDesktop) setMobileSidebarOpen(false);
                setActivePage("");
                navigateTo("");
              }}
              className="flex items-center justify-center"
            >
              {/* Icon */}
              <div
                className="
                  z-10 flex h-13 w-13
                  items-center justify-center
                  rounded-full
                  border-5
                  border-[var(--topbtn-primary)]
                  bg-[var(--card)]
                  shadow-md
                "
              >
                <Radio className="h-6 w-6" color="var(--foreground)" />
              </div>

              {/* Live Preview */}
              {!collapsed && (
                <div
                  className="
                    -ml-3 flex h-9 w-[170px]
                    items-center justify-center
                    rounded-r-xl
                    bg-gradient-to-r
                    from-[var(--topbtn-primary)]
                    to-[var(--topbtn-secondary)]
                    pl-6 pr-4
                    text-sm font-medium
                    text-[var(--sidebar-primary-foreground)]
                    shadow-md
                  "
                >
                  Live Preview
                </div>
              )}
            </button>

            {/* MENU ITEMS */}
            <div
              className="
                mt-4
                flex-1
                min-h-0
                overflow-y-auto
                pr-1 p-1
                custom-scrollbar
                border-t
                border-sidebar-border
                rounded-lg
              "
            >
              {visibleGroups.map((group) => (
                <div key={group.id} className="mb-3">
                  {/* Group Header */}
                  {!collapsed && (
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="
                          flex w-full
                          items-center justify-between
                          rounded-lg
                          px-3 py-2
                          text-xs
                          font-semibold
                          uppercase
                          tracking-wide
                          text-[color-mix(in_srgb,var(--sidebar-primary-foreground)_75%,transparent)]
                          hover:bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_5%,transparent)]
                        "
                    >
                      <span>{group.group_name}</span>

                      {expandedGroups[group.id] ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  )}

                  {/* Group Items */}
                  {(collapsed || expandedGroups[group.id]) && (
                    <div className="mt-1 ml-2 space-y-1">
                      {group.data.map((item) => (
                        <button
                          key={item.id}
                          disabled={!sidebarDestination(item)}
                          title={!sidebarDestination(item) ? "Navigation is not configured for this item" : item.name}
                          onClick={() => {
                            if (isDesktop) {
                              setSidebarCollapsed(true);
                            } else {
                              setMobileSidebarOpen(false);
                            }
                            setActivePage(item.id);
                            const target = sidebarDestination(item);
                            if (target) navigateTo(target);
                          }}
                          className={`
                                flex w-full
                                items-center gap-3
                                rounded-lg p-2
                                transition-all duration-200
                                hover:bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_5%,transparent)]
                                ${collapsed ? "justify-center" : ""}
                                ${activePage === item.id
                              ? "bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_10%,transparent)] rounded-full shadow-lg"
                              : ""
                            }
                              `}
                        >
                          <Icon
                            name={item.icon}
                            library={item.library}
                            className={`
                                  h-4 w-4 shrink-0
                                  ${activePage === item.id
                                ? "scale-125 text-[var(--topbtn-primary)]"
                                : ""
                              }
                                `}
                          />

                          {!collapsed && (
                            <>
                              <span className="flex-1 truncate text-left">
                                {item.name}
                              </span>

                              {item.key &&
                                sidebarCounts?.stats?.[item.key] &&
                                sidebarCountPending ? (
                                <Skeleton count={1} />
                              ) : (
                                <span
                                  className="
                                        rounded-full
                                        bg-[color-mix(in_srgb,var(--primary)_20%,transparent)]
                                        px-2 py-0.5
                                        text-xs
                                      "
                                >
                                  {sidebarCounts?.stats?.[item.key]?.count || 0}
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>


          </>
        )}
      </motion.aside>
    </>
  );
}
