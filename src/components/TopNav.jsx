import {
  Sparkles,
  Flame,
  X,
  CircleAlert,
  BellIcon,
  User2,
  LogOut,
  MailWarning,
  Camera,
  Users,
  Copy,
  Check,
  GraduationCap,
  MailOpen,
  Send,
  Bell,
  ChevronRight,
  Menu,
  MoreVertical,
} from "lucide-react";

import { useDispatch, useSelector } from "react-redux";
import { useContext, useEffect, useState, createElement, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageContext } from "../context/pageContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { logout } from "../store/Slices/userSlice";
import { SocketContext } from "../context/SocketContext";
import GlobalSearch from "./GlobalSearch";
import ProfileImageCropper from "./ProfileImageCropper";
import { useOutboxStats } from "../queries/outbox.queries";
import { useTodayPaymentReminderStats } from "../queries/reminder.queries";
import { useCrmUsers } from "../queries/users.queries";
import { useGpcTrainingStatus } from "../queries/training.queries";
import { fetchGpc } from "../services/api";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { THEMES, setTheme, getTheme } from "../utils/theme";

/* ─────────────────────────────────────────────────────────────
   Avatar colour palette
───────────────────────────────────────────────────────────── */

const AVATAR_COLORS = [
  {
    bg: "bg-violet-100",
    text: "text-violet-700",
    ring: "ring-violet-400",
    dot: "bg-violet-400",
  },
  {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    ring: "ring-emerald-400",
    dot: "bg-emerald-400",
  },
  {
    bg: "bg-sky-100",
    text: "text-sky-700",
    ring: "ring-sky-400",
    dot: "bg-sky-400",
  },
  {
    bg: "bg-amber-100",
    text: "text-amber-700",
    ring: "ring-amber-400",
    dot: "bg-amber-400",
  },
  {
    bg: "bg-rose-100",
    text: "text-rose-700",
    ring: "ring-rose-400",
    dot: "bg-rose-400",
  },
  {
    bg: "bg-teal-100",
    text: "text-teal-700",
    ring: "ring-teal-400",
    dot: "bg-teal-400",
  },
  {
    bg: "bg-fuchsia-100",
    text: "text-fuchsia-700",
    ring: "ring-fuchsia-400",
    dot: "bg-fuchsia-400",
  },
  {
    bg: "bg-orange-100",
    text: "text-orange-700",
    ring: "ring-orange-400",
    dot: "bg-orange-400",
  },
];

function getColorForUser(email = "") {
  let hash = 0;

  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }

  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name = "", email = "") {
  if (name?.trim()) {
    const parts = name.trim().split(" ");

    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return (email?.[0] ?? "?").toUpperCase();
}

function formatLastActive(ts) {
  if (!ts) return "";

  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);

  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;

  return `${Math.floor(diff / 3600)}h ago`;
}

/* ─────────────────────────────────────────────────────────────
   User Activity Panel
───────────────────────────────────────────────────────────── */

function UserActivityPanel({ activeUsers = [], currentUserEmail = "" }) {
  const [open, setOpen] = useState(false);

  const ref = useRef(null);
  const navigateTo = useNavigate();

  const { data: crmUsers } = useCrmUsers();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const onlineUsers = activeUsers.filter((u) => u?.status === "online");

  const idleUsers = activeUsers.filter((u) => u?.status !== "online");

  const meOnline = onlineUsers?.find((u) => u?.email === currentUserEmail);

  const otherOnlineUsers = onlineUsers.filter(
    (u) => u?.email !== currentUserEmail,
  );

  const orderedOnline = meOnline
    ? [meOnline, ...otherOnlineUsers]
    : otherOnlineUsers;

  const ordered = [...orderedOnline, ...idleUsers];

  const stackVisible = orderedOnline.slice(0, 4);

  const overflow = Math.max(0, orderedOnline.length - 4);

  const onlineCount = onlineUsers.length;

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${onlineCount} online users`}
        aria-expanded={open}
        aria-haspopup="true"
        className="
          flex
          items-center
          gap-1.5
          rounded-xl
          border
          border-border
          bg-background
          px-2.5
          py-1.5
          transition
          hover:bg-accent
          active:scale-95
        "
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className="
              absolute
              inline-flex
              h-full
              w-full
              animate-ping
              rounded-full
              bg-emerald-400
              opacity-60
            "
          />

          <span
            className="
              relative
              inline-flex
              h-2
              w-2
              rounded-full
              bg-emerald-500
            "
          />
        </span>

        <div className="flex h-2 w-full items-center">
          {stackVisible.map((u, i) => {
            const c = getColorForUser(u.email);

            const name = crmUsers?.find(
              (user) => user?.description === u.email,
            )?.name;

            const initials = getInitials(name || u.name, u.email);

            const isMe = u.email === currentUserEmail;

            return (
              <span
                key={u.email}
                title={isMe ? "You" : name || u.email}
                className={`
                  relative
                  flex
                  h-4
                  w-4
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  text-[9px]
                  font-bold
                  ring-2
                  ring-card
                  ${c.bg}
                  ${c.text}
                  ${i > 0 ? "-ml-1.5" : ""}
                  ${isMe ? "ring-primary" : ""}
                `}
              >
                {initials}

                <span
                  className={`
                    absolute
                    bottom-0
                    right-0
                    h-1.5
                    w-1.5
                    rounded-full
                    border
                    border-card
                    ${
                      u?.status === "online" ? "bg-emerald-500" : "bg-amber-400"
                    }
                  `}
                />
              </span>
            );
          })}

          {overflow > 0 && (
            <span
              className="
                -ml-1.5
                flex
                h-6
                w-6
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-muted
                text-[9px]
                font-bold
                text-muted-foreground
                ring-2
                ring-card
              "
            >
              +{overflow}
            </span>
          )}
        </div>

        <span
          className="
            text-[11px]
            font-semibold
            text-primary
          "
        >
          {onlineCount}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: -8,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -8,
              scale: 0.96,
            }}
            transition={{
              duration: 0.18,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="
              absolute
              right-0
              top-full
              z-50
              mt-2.5
              w-[340px]
              overflow-hidden
              rounded-2xl
              border
              border-border
              bg-card
              shadow-2xl
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-border
                px-4
                py-3
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <Users size={18} className="text-primary" strokeWidth={2} />

                <span className="text-sm font-semibold">Active users</span>

                <span
                  className="
                    rounded-full
                    bg-primary/10
                    px-2
                    py-0.5
                    text-[10px]
                    font-bold
                    text-primary
                  "
                >
                  {onlineCount}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigateTo("/settings/user-activity");
                }}
                className="
                  text-[11px]
                  font-medium
                  text-primary
                  transition
                  hover:opacity-75
                "
              >
                View all →
              </button>
            </div>

            <div className="max-h-[340px] overflow-y-auto">
              {ordered.length === 0 ? (
                <p
                  className="
                    p-4
                    text-center
                    text-sm
                    text-muted-foreground
                  "
                >
                  No active users right now.
                </p>
              ) : (
                ordered.map((u) => {
                  const c = getColorForUser(u.email);

                  const name = crmUsers?.find(
                    (user) => user?.description === u.email,
                  )?.name;

                  const initials = getInitials(name || u.name, u.email);

                  const isMe = u.email === currentUserEmail;

                  const isOnline = u?.status === "online";

                  return (
                    <div
                      key={u.email}
                      onClick={() =>
                        navigateTo(
                          `/view-reports?email=${encodeURIComponent(u.email)}`,
                        )
                      }
                      className="
                        flex
                        items-center
                        gap-3
                        border-b
                        border-border
                        px-4
                        py-3
                        last:border-none
                        transition
                        hover:bg-accent
                      "
                    >
                      <div
                        className="
                          relative
                          shrink-0
                        "
                      >
                        <span
                          className={`
                            flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-full
                            text-xs
                            font-bold
                            ${c.bg}
                            ${c.text}
                          `}
                        >
                          {initials}
                        </span>

                        <span
                          className={`
                            absolute
                            bottom-0
                            right-0
                            h-2.5
                            w-2.5
                            rounded-full
                            border-2
                            border-card
                            ${isOnline ? "bg-emerald-500" : "bg-amber-400"}
                          `}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className="
                            flex
                            items-center
                            gap-1.5
                          "
                        >
                          <p
                            className="
                              truncate
                              text-sm
                              font-semibold
                            "
                          >
                            {name || u.name}
                          </p>

                          {isMe && (
                            <span
                              className="
                                rounded
                                bg-primary/10
                                px-1.5
                                py-0.5
                                text-[9px]
                                font-bold
                                text-primary
                              "
                            >
                              you
                            </span>
                          )}
                        </div>

                        <p
                          className="
                            truncate
                            text-[11px]
                            text-muted-foreground
                          "
                        >
                          {u.email}
                        </p>

                        <div
                          className="
                            mt-0.5
                            flex
                            items-center
                            gap-1
                          "
                        >
                          <span
                            className="
                              h-1
                              w-1
                              rounded-full
                              bg-muted-foreground
                            "
                          />

                          <p
                            className="
                              truncate
                              text-[11px]
                              text-muted-foreground
                            "
                          >
                            {u.page == "/" ? "Timeline" : u.page}
                          </p>
                        </div>
                      </div>

                      <div
                        className="
                          flex
                          shrink-0
                          flex-col
                          items-end
                          gap-1
                        "
                      >
                        <span
                          className={`
                            rounded-full
                            px-2
                            py-0.5
                            text-[10px]
                            font-semibold
                            ${
                              isOnline
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }
                          `}
                        >
                          {isOnline ? "Online" : "Idle"}
                        </span>

                        <span
                          className="
                            text-[10px]
                            text-muted-foreground
                          "
                        >
                          {formatLastActive(u.lastActiveAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div
              className="
                flex
                items-center
                gap-3
                border-t
                border-border
                bg-muted/50
                px-4
                py-2.5
              "
            >
              <span
                className="
                  flex
                  items-center
                  gap-1
                  text-[10px]
                  text-muted-foreground
                "
              >
                <span
                  className="
                    h-2
                    w-2
                    rounded-full
                    bg-emerald-500
                  "
                />
                Online — active &lt;5 min
              </span>

              <span
                className="
                  flex
                  items-center
                  gap-1
                  text-[10px]
                  text-muted-foreground
                "
              >
                <span
                  className="
                    h-2
                    w-2
                    rounded-full
                    bg-amber-400
                  "
                />
                Idle — 5–15 min
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Stat Badge
───────────────────────────────────────────────────────────── */

const StatBadge = ({ icon, label, value, colorClass, bgClass }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);

    const t = setTimeout(() => setAnimate(false), 400);

    return () => clearTimeout(t);
  }, [value]);

  return (
    <div
      className="
        group
        flex
        cursor-default
        items-center
        gap-3
        px-3
        py-2
      "
    >
      <div
        className={`
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-full
          ${bgClass}
          transition-all
          duration-300
        `}
      >
        {createElement(icon, {
          className: `
            h-4
            w-4
            ${colorClass}
            transition-transform
            duration-300
            group-hover:scale-110
          `,
        })}
      </div>

      <div
        className="
          flex
          flex-col
          leading-tight
        "
      >
        <span
          className="
            whitespace-nowrap
            text-[15px]
            font-medium
            text-foreground
          "
        >
          {label}
        </span>

        <span
          className={`
            text-[18px]
            font-medium
            text-foreground
            transition-all
            duration-300
            ${animate ? "scale-110" : "scale-100"}
          `}
        >
          {value ?? "—"}
        </span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main TopNav
───────────────────────────────────────────────────────────── */

export function TopNav() {
  const dispatch = useDispatch();
  const navigateTo = useNavigate();

  const [stats, setStats] = useState({
    reply_recieved: null,
    reply_sent: null,
    reminder_sent: null,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchGpc({
          method: "GET",
          params: {
            type: "statscount",
          },
        });

        if (data?.success && data?.stats) {
          setStats({
            reply_recieved: data.stats.reply_recieved,

            reply_sent: data.stats.reply_sent,

            reminder_sent: data.stats.reminder_sent,
          });
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };

    loadStats();
  }, []);

  /* ── Data ── */

  const { activeUsers = [] } = useContext(SocketContext);

  const { data } = useCrmUsers();

  const { enteredEmail, handleClear, mobileSidebarOpen, setMobileSidebarOpen } =
    useContext(PageContext);

  const { user, error } = useSelector((s) => s.user);
  const { data: trainingStatus, refetch: refetchTrainingStatus } =
    useGpcTrainingStatus(user?.email);

  /* ── Local state ── */

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [showTraining, setShowTraining] = useState(false);
  const [copied, setCopied] = useState(false);

  const [selectedTheme, setSelectedTheme] = useState(getTheme);

  const [profilePreview, setProfilePreview] = useState(
    () =>
      sessionStorage.getItem("userProfileImage") || user?.profileImage || "",
  );

  const [showCropper, setShowCropper] = useState(false);

  const [cropImage, setCropImage] = useState(null);

  // Responsive overflow menu: below lg the right-side controls
  // are collapsed so the search field never gets squeezed off-screen.
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = useRef(null);
  const isDesktop = useIsDesktop();

  /* ── Derived ── */

  const isSearchActive = Boolean(enteredEmail?.trim());
  // Keep the control hidden until both Rightee CRM values are known.
  const canOpenTraining =
    Number.isFinite(trainingStatus?.completedCount) &&
    Number.isFinite(trainingStatus?.totalCount) &&
    trainingStatus.totalCount > 0 &&
    trainingStatus.completedCount < trainingStatus.totalCount;

  /* ── Profile image ── */

  useEffect(() => {
    const saved = sessionStorage.getItem("userProfileImage");

    setProfilePreview(saved || user?.profileImage || "");
  }, [user?.profileImage]);

  // Close the compact mobile/tablet menu when clicking outside it.
  useEffect(() => {
    const handler = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Restore the full desktop layout when the viewport grows back to lg+.
  useEffect(() => {
    if (isDesktop && showMobileMenu) {
      setShowMobileMenu(false);
    }
  }, [isDesktop, showMobileMenu]);

  /* ── Initialize theme ── */

  useEffect(() => {
    const theme = getTheme();

    setTheme(theme);

    setSelectedTheme(theme);
  }, []);

  /* ── Theme change ── */

  const handleThemeChange = (theme) => {
    const appliedTheme = setTheme(theme);

    setSelectedTheme(appliedTheme);
  };

  /* ── Logout ── */

  const handleLogout = () => {
    dispatch(logout());

    setShowProfileMenu(false);
  };
    const handleTrainingClose = () => {
    setShowTraining(false);
    refetchTrainingStatus();
  };
  /* ── Copy email ── */

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(enteredEmail || user?.email || "");

      setCopied(true);

      toast.success("Email copied");

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (err) {
      toast.error("Failed to copy email");
    }
  };

  /* ── Profile upload ── */

  const handleProfileUpload = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setCropImage(reader.result);

      setShowCropper(true);
    };

    reader.readAsDataURL(file);
  };

  /* ── Profile save ── */

  const handleProfileSave = (croppedImage) => {
    setProfilePreview(croppedImage);

    sessionStorage.setItem("userProfileImage", croppedImage);
  };

  /* ── Initials ── */

  const getUserInitials = () => {
    const name =
      data?.find((d) => d.description === user?.email)?.name || user?.name;

    if (!name) return "U";

    const parts = name.trim().split(" ");

    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      data-tour="top-nav"
      className="
        sticky
        top-0
        z-[999]
        flex
        w-full
        min-w-0
        items-center
        justify-between
        gap-2
        rounded-md
        border
        border-border
        bg-white
        p-2
        sm:gap-3
      "
    >
      {/* =====================================================
          SEARCH & MOBILE SIDEBAR TRIGGER
      ====================================================== */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 lg:flex-initial">
        {/* ── Sidebar drawer trigger — small screens only ── */}
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          aria-label={
            mobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={Boolean(mobileSidebarOpen)}
          aria-controls="app-sidebar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 active:scale-90 lg:hidden"
        >
          {mobileSidebarOpen ? (
            <X size={20} strokeWidth={2.2} />
          ) : (
            <Menu size={20} strokeWidth={2.2} />
          )}
        </button>
        <div
          className="
            flex
            min-w-0
            flex-1
            items-center
            justify-center
            gap-2
            p-1
            lg:flex-initial
          "
          data-tour="top-nav-search"
        >
          <AnimatePresence mode="wait">
            {isSearchActive ? (
              <motion.div
                key="banner"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{
                  duration: 0.2,
                  ease: [0.32, 0.72, 0, 1],
                }}
                role="status"
                aria-live="polite"
                className="
                  flex
                  min-w-0
                  max-w-full
                  flex-1
                  items-center
                  gap-2.5
                  rounded-2xl
                  border
                  border-primary/20
                  bg-primary/5
                  px-3
                  py-2
                  shadow-sm
                  sm:px-4
                  lg:max-w-[400px]
                  lg:flex-initial
                "
              >
                <span
                  aria-hidden="true"
                  className="
                    h-2
                    w-2
                    shrink-0
                    animate-pulse
                    rounded-full
                    bg-primary
                  "
                  style={{ animationDuration: "1.4s" }}
                />

                <span
                  className="
                    flex
                    min-w-0
                    items-center
                    gap-1.5
                    text-sm
                    leading-none
                    text-primary
                    sm:text-[16px]
                  "
                >
                  <span className="hidden shrink-0 font-normal sm:inline">
                    Viewing record for
                  </span>

                  <span
                    title={enteredEmail}
                    className="
                      min-w-0
                      truncate
                      font-bold
                      text-primary
                      underline
                      decoration-dashed
                      underline-offset-2
                      lg:max-w-[220px]
                    "
                  >
                    {enteredEmail}
                  </span>
                </span>

                <div className="ml-1 flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label="Copy email"
                    title={copied ? "Copied!" : "Copy email"}
                    onClick={handleCopyEmail}
                    className="
                      flex
                      h-[22px]
                      w-[22px]
                      items-center
                      justify-center
                      rounded-lg
                      bg-primary/10
                      text-primary
                      transition
                      hover:bg-primary/20
                      active:scale-90
                    "
                  >
                    {copied ? (
                      <Check size={11} strokeWidth={2.5} />
                    ) : (
                      <Copy size={11} strokeWidth={2.5} />
                    )}
                  </button>

                  <button
                    type="button"
                    aria-label="Clear current record"
                    onClick={handleClear}
                    className="
                      flex
                      h-[22px]
                      w-[22px]
                      items-center
                      justify-center
                      rounded-lg
                      bg-primary/10
                      text-primary
                      transition
                      hover:bg-primary/20
                      active:scale-90
                    "
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <GlobalSearch />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* =====================================================
          RIGHT NAVIGATION — DESKTOP
          Full controls remain unchanged at lg and above.
      ====================================================== */}
      <div className="hidden shrink-0 items-center justify-end gap-1.5 lg:flex">
        <div className="flex shrink-0 items-center gap-2">
          <UserActivityPanel
            activeUsers={activeUsers}
            currentUserEmail={user?.email}
          />
        </div>

        {canOpenTraining && (
          <button
            type="button"
            onClick={() => setShowTraining(true)}
            className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 active:scale-95"
          >
            <GraduationCap size={16} aria-hidden="true" />
            GPC Training
          </button>
        )}

        <div className="mx-1 h-8 w-px bg-border" aria-hidden="true" />
        <div className="mx-1 h-8 w-px bg-border" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setShowProfileMenu(true)}
          aria-label="Open profile"
          aria-expanded={showProfileMenu}
          className="
            flex
            items-center
            gap-2
            rounded-xl
            border
            border-border
            bg-card
            py-1
            pl-1
            pr-1
            shadow-sm
            transition
            hover:border-primary
            hover:bg-accent
            active:scale-95
          "
        >
          {profilePreview ? (
            <img
              src={profilePreview}
              alt={user?.name ?? "Profile"}
              className="h-7 w-7 rounded-lg object-cover"
            />
          ) : (
            <span
              className="
                flex
                h-7
                w-7
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-xs
                font-bold
                text-primary-foreground
              "
              style={{
                background:
                  "linear-gradient(135deg, var(--topbtn-primary), var(--topbtn-secondary))",
              }}
            >
              {getUserInitials()}
            </span>
          )}
        </button>
      </div>

      {/* =====================================================
          RIGHT NAVIGATION — MOBILE / TABLET
          Stats + active users + profile are intentionally collapsed
          into one menu below lg so the top bar remains usable.
      ====================================================== */}
      <div ref={mobileMenuRef} className="relative shrink-0 lg:hidden">
        <button
          type="button"
          onClick={() => setShowMobileMenu((v) => !v)}
          aria-label="More navigation options"
          aria-expanded={showMobileMenu}
          aria-haspopup="true"
          className="
            relative
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-xl
            border
            border-border
            bg-card
            text-muted-foreground
            shadow-sm
            transition
            hover:border-primary
            hover:bg-accent
            hover:text-primary
            active:scale-90
          "
        >
          {profilePreview ? (
            <img
              src={profilePreview}
              alt=""
              className="h-7 w-7 rounded-lg object-cover"
            />
          ) : (
            <MoreVertical size={20} strokeWidth={2.2} />
          )}

          {activeUsers.some((u) => u?.status === "online") && (
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-card bg-emerald-500" />
            </span>
          )}
        </button>

        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{
                duration: 0.18,
                ease: [0.32, 0.72, 0, 1],
              }}
              role="menu"
              className="
                absolute
                right-0
                top-full
                z-[1000]
                mt-2.5
                w-[min(20rem,calc(100vw-1.5rem))]
                overflow-hidden
                rounded-2xl
                border
                border-border
                bg-card
                shadow-2xl
              "
            >
              {/* Profile summary */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowProfileMenu(true);
                }}
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  border-b
                  border-border
                  p-3.5
                  text-left
                  transition
                  hover:bg-accent
                "
              >
                {profilePreview ? (
                  <img
                    src={profilePreview}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      text-sm
                      font-bold
                      text-primary-foreground
                    "
                    style={{
                      background:
                        "linear-gradient(135deg, var(--topbtn-primary), var(--topbtn-secondary))",
                    }}
                  >
                    {getUserInitials()}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {data?.find((d) => d.description === user?.email)?.name ||
                      user?.name ||
                      "User"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className="shrink-0 text-muted-foreground"
                />
              </button>

              {/* Compact stats */}
              <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                {[
                  {
                    icon: MailOpen,
                    label: "Received",
                    value: stats.reply_recieved,
                    colorClass: "text-emerald-500",
                    bgClass: "bg-emerald-100",
                  },
                  {
                    icon: Send,
                    label: "Sent",
                    value: stats.reply_sent,
                    colorClass: "text-blue-600",
                    bgClass: "bg-blue-100",
                  },
                  {
                    icon: Bell,
                    label: "Reminders",
                    value: stats.reminder_sent,
                    colorClass: "text-amber-500",
                    bgClass: "bg-amber-100",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="flex flex-col items-center gap-1 px-2 py-3"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${s.bgClass}`}
                    >
                      {createElement(s.icon, {
                        className: `h-3.5 w-3.5 ${s.colorClass}`,
                      })}
                    </span>
                    <span className="text-[15px] font-semibold leading-none">
                      {s.value ?? "—"}
                    </span>
                    <span className="text-[10px] font-medium leading-none text-muted-foreground">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-0.5 p-2">
                <button
                  type="button"
                  onClick={() => {
                    navigateTo("/settings/user-activity");
                    setShowMobileMenu(false);
                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2.5
                    text-left
                    text-sm
                    font-medium
                    transition
                    hover:bg-accent
                  "
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users size={14} />
                  </span>

                  <span className="flex-1">Active users</span>

                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {activeUsers.filter((u) => u?.status === "online").length}
                  </span>
                </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowTraining(true);
                    }}
                    className="
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-xl
                      px-3
                      py-2.5
                      text-left
                      text-sm
                      font-medium
                      transition
                      hover:bg-accent
                    "
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <GraduationCap size={14} />
                    </span>

                    <span className="flex-1">GPC Training</span>

                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                

                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowProfileMenu(true);
                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2.5
                    text-left
                    text-sm
                    font-medium
                    transition
                    hover:bg-accent
                  "
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <Sparkles size={14} />
                  </span>

                  <span className="flex-1">Profile & preferences</span>

                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>

                <div className="mx-2 my-1 h-px bg-border" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2.5
                    text-left
                    text-sm
                    font-semibold
                    text-destructive
                    transition
                    hover:bg-destructive/10
                  "
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                    <LogOut size={14} />
                  </span>

                  <span className="flex-1">Log out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =====================================================
          PROFILE DRAWER
      ====================================================== */}

      <AnimatePresence>
        {showProfileMenu && (
          <>
            {/* Backdrop */}

            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 0.2,
              }}
              className="
                fixed
                inset-0
                z-[9998]
                bg-foreground/45
                backdrop-blur-[2px]
              "
              onClick={() => setShowProfileMenu(false)}
            />

            {/* Drawer */}

            <motion.aside
              initial={{
                x: "100%",
              }}
              animate={{
                x: 0,
              }}
              exit={{
                x: "100%",
              }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 32,
              }}
              className="
                fixed
                right-0
                top-0
                z-[9999]
                flex
                h-screen
                w-[min(420px,100vw)]
                max-w-[420px]
                flex-col
                overflow-hidden
                border-l
                border-border
                bg-background
                text-foreground
                shadow-2xl
              "
            >
              {/* =================================================
                  HEADER
              ================================================== */}

              <div
                className="
                  flex
                  shrink-0
                  items-center
                  justify-between
                  border-b
                  border-border
                  px-5
                  py-4
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-xl
                      bg-primary
                      text-primary-foreground
                    "
                  >
                    <User2 size={19} />
                  </div>

                  <div>
                    <h2
                      className="
                        text-base
                        font-semibold
                      "
                    >
                      My Account
                    </h2>

                    <p
                      className="
                        text-xs
                        text-muted-foreground
                      "
                    >
                      Profile & preferences
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowProfileMenu(false)}
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    text-muted-foreground
                    transition
                    hover:bg-accent
                    hover:text-foreground
                  "
                >
                  <X size={19} />
                </button>
              </div>

              {/* =================================================
                  CONTENT
              ================================================== */}

              <div
                className="
                  flex-1
                  overflow-y-auto
                  custom-scrollbar
                "
              >
                {/* PROFILE */}

                <section
                  className="
                    border-b
                    border-border
                    p-5
                  "
                >
                  <div
                    className="
                      relative
                      overflow-hidden
                      rounded-2xl
                      border
                      border-border
                      bg-card
                      p-4
                    "
                  >
                    <div
                      className="
                        absolute
                        inset-x-0
                        top-0
                        h-20
                      "
                      style={{
                        background:
                          "linear-gradient(135deg, var(--topbtn-primary), var(--topbtn-secondary))",
                      }}
                    />

                    <div
                      className="
                        relative
                        pt-7
                      "
                    >
                      <div
                        className="
                          flex
                          items-end
                          gap-3
                        "
                      >
                        {/* Avatar */}

                        <div
                          className="
                            relative
                            shrink-0
                          "
                        >
                          {profilePreview ? (
                            <img
                              src={profilePreview}
                              alt={user?.name ?? "Profile"}
                              className="
                                h-20
                                w-20
                                rounded-2xl
                                border-4
                                border-card
                                object-cover
                                shadow-lg
                              "
                            />
                          ) : (
                            <span
                              className="
                                flex
                                h-20
                                w-20
                                items-center
                                justify-center
                                rounded-2xl
                                border-4
                                border-card
                                text-xl
                                font-bold
                                text-primary-foreground
                                shadow-lg
                              "
                              style={{
                                background:
                                  "linear-gradient(135deg, var(--topbtn-primary), var(--topbtn-secondary))",
                              }}
                            >
                              {getUserInitials()}
                            </span>
                          )}

                          <label
                            htmlFor="drawer-profile-upload"
                            className="
                              absolute
                              -bottom-1
                              -right-1
                              flex
                              h-8
                              w-8
                              cursor-pointer
                              items-center
                              justify-center
                              rounded-full
                              border-2
                              border-card
                              bg-primary
                              text-primary-foreground
                              shadow-md
                              transition
                              hover:opacity-90
                            "
                          >
                            <Camera size={14} />

                            <input
                              id="drawer-profile-upload"
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={handleProfileUpload}
                            />
                          </label>
                        </div>

                        {/* User */}

                        <div
                          className="
                            min-w-0
                            flex-1
                            pb-1
                          "
                        >
                          <h3
                            className="
                              truncate
                              text-base
                              font-semibold
                            "
                          >
                            {data?.find((d) => d.description === user?.email)
                              ?.name || user?.name}
                          </h3>

                          <p
                            className="
                              truncate
                              text-xs
                              text-muted-foreground
                            "
                          >
                            {user?.email}
                          </p>
                        </div>
                      </div>

                      <div
                        className="
                          mt-5
                          grid
                          grid-cols-2
                          gap-2
                        "
                      >
                        <button
                          type="button"
                          onClick={() => {
                            navigateTo("/profile");

                            setShowProfileMenu(false);
                          }}
                          className="
                            flex
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-border
                            bg-background
                            px-3
                            py-2.5
                            text-sm
                            font-medium
                            transition
                            hover:bg-accent
                          "
                        >
                          <User2 size={15} />
                          View profile
                        </button>

                        <label
                          htmlFor="drawer-profile-upload"
                          className="
                            flex
                            cursor-pointer
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            bg-primary
                            px-3
                            py-2.5
                            text-sm
                            font-medium
                            text-primary-foreground
                            transition
                            hover:opacity-90
                          "
                        >
                          <Camera size={15} />
                          Change photo
                        </label>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ACCOUNT */}

                <section
                  className="
                    border-b
                    border-border
                    p-5
                  "
                >
                  <div className="mb-3">
                    <h3
                      className="
                        text-sm
                        font-semibold
                      "
                    >
                      Account
                    </h3>

                    <p
                      className="
                        text-xs
                        text-muted-foreground
                      "
                    >
                      Manage your account
                    </p>
                  </div>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigateTo("/profile");

                        setShowProfileMenu(false);
                      }}
                      className="
                        flex
                        w-full
                        items-center
                        gap-3
                        rounded-xl
                        px-3
                        py-3
                        text-left
                        transition
                        hover:bg-accent
                      "
                    >
                      <span
                        className="
                          flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-lg
                          bg-secondary
                          text-secondary-foreground
                        "
                      >
                        <User2 size={16} />
                      </span>

                      <span className="flex-1">
                        <span
                          className="
                            block
                            text-sm
                            font-medium
                          "
                        >
                          Edit profile
                        </span>

                        <span
                          className="
                            block
                            text-xs
                            text-muted-foreground
                          "
                        >
                          Update your personal information
                        </span>
                      </span>

                      <ChevronRight
                        size={16}
                        className="
                          text-muted-foreground
                        "
                      />
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="
                        flex
                        w-full
                        items-center
                        gap-3
                        rounded-xl
                        px-3
                        py-3
                        text-left
                        transition
                        hover:bg-accent
                      "
                    >
                      <span
                        className="
                          flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-lg
                          bg-secondary
                          text-secondary-foreground
                        "
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </span>

                      <span className="flex-1">
                        <span
                          className="
                            block
                            text-sm
                            font-medium
                          "
                        >
                          {copied ? "Email copied" : "Copy email"}
                        </span>

                        <span
                          className="
                            block
                            max-w-[260px]
                            truncate
                            text-xs
                            text-muted-foreground
                          "
                        >
                          {user?.email}
                        </span>
                      </span>
                    </button>
                  </div>
                </section>

                {/* =================================================
                    COLOR THEME
                ================================================== */}

                <section
                  className="
                    border-b
                    border-border
                    p-5
                  "
                >
                  <div className="mb-4">
                    <h3
                      className="
                        text-sm
                        font-semibold
                      "
                    >
                      Color theme
                    </h3>

                    <p
                      className="
                        text-xs
                        text-muted-foreground
                      "
                    >
                      Choose how your CRM looks
                    </p>
                  </div>

                  <div
                    className="
                      grid
                      grid-cols-2
                      gap-3
                    "
                  >
                    {THEMES.map((theme) => {
                      const active = selectedTheme === theme.id;

                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => handleThemeChange(theme.id)}
                          className={`
                              group
                              relative
                              overflow-hidden
                              rounded-xl
                              border
                              p-3
                              text-left
                              transition-all

                              ${
                                active
                                  ? "border-primary ring-2 ring-primary/20"
                                  : "border-border hover:border-primary/50"
                              }
                            `}
                        >
                          {/* Theme preview */}

                          <div
                            className="
                                mb-3
                                h-14
                                overflow-hidden
                                rounded-lg
                              "
                            style={{
                              background: theme.colors.primary,
                            }}
                          >
                            <div
                              className="
                                  flex
                                  h-full
                                "
                            >
                              <div
                                className="
                                    w-1/3
                                  "
                                style={{
                                  background: theme.colors.secondary,
                                }}
                              />

                              <div
                                className="
                                    flex
                                    flex-1
                                    flex-col
                                    p-2
                                  "
                              >
                                <div
                                  className="
                                      mb-1
                                      h-1.5
                                      w-12
                                      rounded-full
                                    "
                                  style={{
                                    background: theme.colors.accent,
                                  }}
                                />

                                <div className="space-y-1">
                                  <div
                                    className="
                                        h-1
                                        w-16
                                        rounded-full
                                        bg-white/30
                                      "
                                  />

                                  <div
                                    className="
                                        h-1
                                        w-10
                                        rounded-full
                                        bg-white/20
                                      "
                                  />

                                  <div
                                    className="
                                        h-1
                                        w-14
                                        rounded-full
                                        bg-white/20
                                      "
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div
                            className="
                                flex
                                items-center
                                justify-between
                                gap-2
                              "
                          >
                            <div className="min-w-0">
                              <p
                                className="
                                    truncate
                                    text-sm
                                    font-medium
                                  "
                              >
                                {theme.name}
                              </p>

                              <p
                                className="
                                    truncate
                                    text-[11px]
                                    text-muted-foreground
                                  "
                              >
                                {theme.description}
                              </p>
                            </div>

                            {active && (
                              <span
                                className="
                                    flex
                                    h-5
                                    w-5
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-primary
                                    text-primary-foreground
                                  "
                              >
                                <Check size={12} />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* PREFERENCES */}

                <section
                  className="
                    border-b
                    border-border
                    p-5
                  "
                >
                  <div className="mb-3">
                    <h3
                      className="
                        text-sm
                        font-semibold
                      "
                    >
                      Preferences
                    </h3>

                    <p
                      className="
                        text-xs
                        text-muted-foreground
                      "
                    >
                      Customize your workspace
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigateTo("/settings");

                      setShowProfileMenu(false);
                    }}
                    className="
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-xl
                      px-3
                      py-3
                      text-left
                      transition
                      hover:bg-accent
                    "
                  >
                    <span
                      className="
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-lg
                        bg-secondary
                        text-secondary-foreground
                      "
                    >
                      <Sparkles size={16} />
                    </span>

                    <span className="flex-1">
                      <span
                        className="
                          block
                          text-sm
                          font-medium
                        "
                      >
                        Workspace settings
                      </span>

                      <span
                        className="
                          block
                          text-xs
                          text-muted-foreground
                        "
                      >
                        Manage CRM preferences
                      </span>
                    </span>

                    <ChevronRight
                      size={16}
                      className="
                        text-muted-foreground
                      "
                    />
                  </button>
                </section>
              </div>

              {/* =================================================
                  FOOTER
              ================================================== */}

              <div
                className="
                  shrink-0
                  border-t
                  border-border
                  bg-background
                  p-4
                "
              >
                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    border
                    border-destructive/20
                    bg-destructive/5
                    px-4
                    py-3
                    text-left
                    text-destructive
                    transition
                    hover:bg-destructive/10
                  "
                >
                  <span
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-lg
                      bg-destructive/10
                    "
                  >
                    <LogOut size={16} />
                  </span>

                  <span className="flex-1">
                    <span
                      className="
                        block
                        text-sm
                        font-semibold
                      "
                    >
                      Log out
                    </span>

                    <span
                      className="
                        block
                        text-xs
                        opacity-70
                      "
                    >
                      Sign out of your account
                    </span>
                  </span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          IMAGE CROPPER
      ====================================================== */}

      <ProfileImageCropper
        isOpen={showCropper}
        image={cropImage}
        onClose={() => setShowCropper(false)}
        onSave={handleProfileSave}
      />
      <AnimatePresence>
         {/* <GpcTrainingFrame
            email={user.email}
            onClose={handleTrainingClose}
          />
         */}
        
      </AnimatePresence>
    </div>
  );
}

const getTrainingUrl = (email) =>
  `https://training.guestpostcrm.com/?email=${encodeURIComponent(email)}`;

function GpcTrainingFrame({ email, onClose }) {
  const trainingUrl = getTrainingUrl(email);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex bg-slate-950/65 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gpc-training-title"
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 12 }}
        transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
        className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 text-slate-800">
            <GraduationCap size={20} className="shrink-0 text-indigo-600" />
            <h2
              id="gpc-training-title"
              className="truncate text-base font-bold"
            >
              GPC Training
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close GPC Training"
          >
            <X size={20} />
          </button>
        </header>
        <iframe
          title="GPC Training"
          src={trainingUrl}
          className="min-h-0 w-full flex-1 border-0 bg-white"
        />
      </motion.section>
    </motion.div>
  );
}
