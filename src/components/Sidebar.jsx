import { Camera, ChevronDown, ChevronRight, Home, LogOut, Palette, PanelLeft, User2, X } from "lucide-react";
import Skeleton from "react-loading-skeleton";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContext } from "../context/pageContext";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { logo, headingLogo } from "../assets/assets";
import Icon from "./ui/Icon/Icon";
import { useSidebarLayout, useSidebarStats } from "../queries/sidebar.queries";
import {
  normalizeSidebarResponse,
  selectVisibleGroups,
} from "../utils/sidebarLayout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { sidebarDestination } from "../utils/sidebarNavigation";
import { filterAdminNavigation, selectIsAdmin } from "../utils/pageAccess";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/Slices/userSlice";
import ProfileImageCropper from "./ProfileImageCropper";
import { THEMES, getTheme, setTheme } from "../utils/theme";

export function Sidebar() {
  const navigateTo = useNavigate();
  const dispatch = useDispatch();
  const isAdmin = useSelector(selectIsAdmin);
  const { user } = useSelector((state) => state.user);

  const {
    enteredEmail: email,
    activePage,
    setActivePage,
    collapsed: desktopCollapsed,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useContext(PageContext);

  const isDesktop = useIsDesktop();
  const collapsed = isDesktop ? desktopCollapsed : false;
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(getTheme);
  const [showCropper, setShowCropper] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [profilePreview, setProfilePreview] = useState(
    () => sessionStorage.getItem("userProfileImage") || user?.profileImage || "",
  );

  useEffect(() => {
    setProfilePreview(
      sessionStorage.getItem("userProfileImage") || user?.profileImage || "",
    );
  }, [user?.profileImage]);

  useEffect(() => {
    const theme = getTheme();
    setTheme(theme);
    setSelectedTheme(theme);
  }, []);

  const getUserInitials = () => {
    const parts = user?.name?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (!parts.length) return "U";
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
  };

  const handleProfileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleProfileSave = (croppedImage) => {
    setProfilePreview(croppedImage);
    sessionStorage.setItem("userProfileImage", croppedImage);
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    dispatch(logout());
  };
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

  const { visibleGroups, rankReports } = useMemo(() => {
    const reports = [];

    const normalized = normalizeSidebarResponse(layoutData, {
      onInvalid: (report) => reports.push(report),
    });

    return {
      visibleGroups: filterAdminNavigation(selectVisibleGroups(normalized), isAdmin),
      rankReports: reports,
    };
  }, [layoutData, isAdmin]);

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
  useEffect(() => {
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
          <Motion.div
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

      <Motion.aside
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

            {/* HOME */}
            <div className="flex justify-center items-center px-3 ">
              <button
                type="button"
                onClick={() => {
                  if (!isDesktop) setMobileSidebarOpen(false);
                  setActivePage("");
                  navigateTo("");
                }}
                className={`flex items-center gap-3 rounded-lg p-2 transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_35%,transparent)]
            ${collapsed ? "justify-center" : "w-full"}
            ${activePage === ""
                    ? "bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_40%,transparent)] rounded-full shadow-lg"
                    : ""
                  }`}
              >
                <Home
                  className={`h-4 w-4 shrink-0 ${activePage === ""
                    ? "scale-125 text-[var(--topbtn-primary)]"
                    : ""
                    }`}
                />

                {!collapsed && (
                  <span className="truncate ">
                    Home
                  </span>
                )}
              </button>
            </div>

            {/* MENU ITEMS */}
            <div
              className="
                mt-3
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
                        <MenuItem item={item} isDesktop={isDesktop} setSidebarCollapsed={setSidebarCollapsed} setActivePage={setActivePage} activePage={activePage} sidebarDestination={sidebarDestination} navigateTo={navigateTo} sidebarCounts={sidebarCounts} sidebarCountPending={sidebarCountPending} collapsed={collapsed} setMobileSidebarOpen={setMobileSidebarOpen} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* PROFILE */}
            <div className="shrink-0 border-t border-sidebar-border p-2 ">
              <button
                type="button"
                onClick={() => setShowProfileMenu(true)}
                aria-label="Open profile and preferences"
                aria-expanded={showProfileMenu}
                className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_8%,transparent)] ${collapsed ? "justify-center" : ""}`}
              >
                {profilePreview ? (
                  <img
                    src={profilePreview}
                    alt={user?.name ?? "Profile"}
                    className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-primary">
                    {getUserInitials()}
                  </span>
                )}

                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{user?.name || "Profile"}</p>
                    <p className="truncate text-xs opacity-70">{user?.email}</p>
                  </div>
                )}
              </button>
            </div>
          </>
        )}
      </Motion.aside>

      <AnimatePresence>
        {showProfileMenu && (
          <>
            <Motion.button
              type="button"
              aria-label="Close profile panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileMenu(false)}
              className="fixed inset-0 z-[9998] cursor-default bg-foreground/45 backdrop-blur-[2px]"
            />

            <Motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 z-[9999] flex h-screen w-[min(420px,100vw)] flex-col overflow-hidden border-l border-border bg-background text-foreground shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="font-semibold">Profile & preferences</h2>
                  <p className="text-xs text-muted-foreground">Manage your account and appearance</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(false)}
                  aria-label="Close profile panel"
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-5">
                <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      {profilePreview ? (
                        <img src={profilePreview} alt={user?.name ?? "Profile"} className="h-16 w-16 rounded-2xl object-cover" />
                      ) : (
                        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--topbtn-primary)] to-[var(--topbtn-secondary)] text-xl font-bold text-primary-foreground">
                          {getUserInitials()}
                        </span>
                      )}
                      <label htmlFor="sidebar-profile-upload" className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-105">
                        <Camera size={15} />
                      </label>
                      <input id="sidebar-profile-upload" type="file" accept="image/*" onChange={handleProfileUpload} className="sr-only" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{user?.name || "User"}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigateTo("/profile");
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted"
                  >
                    <User2 size={16} />
                    View profile
                  </button>
                </section>

                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <Palette size={17} className="text-primary" />
                    <h3 className="text-sm font-semibold">Color theme</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {THEMES.map((theme) => (
                      <button
                        type="button"
                        key={theme.id}
                        onClick={() => setSelectedTheme(setTheme(theme.id))}
                        className={`rounded-xl border p-3 text-left transition ${selectedTheme === theme.id ? "border-primary bg-primary/10 ring-2 ring-primary/15" : "border-border bg-card hover:border-primary/50"}`}
                      >
                        <span className="mb-2 flex gap-1.5">
                          {[theme.colors.primary, theme.colors.secondary, theme.colors.accent].map((color) => (
                            <span key={color} className="h-4 flex-1 rounded-full" style={{ background: color }} />
                          ))}
                        </span>
                        <span className="block text-sm font-semibold">{theme.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{theme.description}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="border-t border-border p-5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
                >
                  <LogOut size={17} />
                  Log out
                </button>
              </div>
            </Motion.aside>
          </>
        )}
      </AnimatePresence>

      <ProfileImageCropper
        isOpen={showCropper}
        image={cropImage}
        onClose={() => setShowCropper(false)}
        onSave={handleProfileSave}
      />
    </>
  );
}
function MenuItem({ item, isDesktop, setSidebarCollapsed, setActivePage, activePage, sidebarDestination, navigateTo, sidebarCounts, sidebarCountPending, collapsed, setMobileSidebarOpen }) {
  return (
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
                                hover:bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_35%,transparent)]
                                ${collapsed ? "justify-center" : ""}
                                ${activePage === item.id
          ? "bg-[color-mix(in_srgb,var(--sidebar-primary-foreground)_50%,transparent)] rounded-full shadow-lg"
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
  )
}
