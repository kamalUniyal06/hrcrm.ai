import {
  Mail,
  Link2,
  List,
  ArrowRight,
  UserCircle2,
  Loader2,
  CheckCircle2,
  PartyPopper,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { createElement, useEffect, useState, useContext } from "react";
import { PageContext } from "../context/pageContext";
import {
  unrepliedAction,
} from "../store/Slices/unrepliedEmails";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { fetchGpc } from "../services/api";
import {
  ONBOARDING_STEP,
  fetchOnboardingProgress,
  getOnboardingRecordName,
} from "../utils/onboardingCompletion";
import { useGpcController } from "../queries/controller.queries";
import { useTimeline } from "../context/TimelineContext";
import { preferencesAction } from "../store/Slices/preferencesSlice";
import { showNewEmailToast } from "./showNewEmailToast";

const FIRST_SYNC_EVENT = "guestpostcrm:first-sync";



const ProfilePromptSkeleton = () => (
  <div className="relative flex min-w-[255px] items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-lg shadow-slate-500/10 backdrop-blur-xl">
    <span className="absolute inset-x-0 bottom-0 h-1 bg-slate-100">
      <span className="block h-full w-1/3 animate-pulse rounded-full bg-slate-300" />
    </span>
    <span className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-slate-200" />
    <span className="min-w-0 flex-1 space-y-2">
      <span className="block h-3 w-24 animate-pulse rounded-full bg-slate-200" />
      <span className="block h-4 w-40 animate-pulse rounded-full bg-slate-100" />
    </span>
    <span className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-slate-200" />
  </div>
);

const WelcomeHeader = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const { currentEmail: email } = useTimeline()
  const { crmEndpoint, businessEmail, user } = useSelector(
    (state) => state.user,
  );
  const { showNewEmailBanner } = useSelector((state) => state.unreplied);
  const { count } = useSelector((state) => state.events);
  const { data } = useGpcController();
  const summary = data?.summary ?? {}
  const onboardingRecordName = getOnboardingRecordName({
    user,
    businessEmail,
  });

  const { handleClear, enteredEmail } = useContext(PageContext);
  const isSearchActive = Boolean(enteredEmail?.trim());
  const [animate, setAnimate] = useState(false);
  const [firstSyncState, setFirstSyncState] = useState({
    status: "idle",
    result: null,
  });
  const [websiteDone, setWebsiteDone] = useState(false);
  const [crmOnboardingStep, setCrmOnboardingStep] = useState(0);
  const [firstSyncRecordsSeen, setFirstSyncRecordsSeen] = useState(false);
  const [crmProgressLoading, setCrmProgressLoading] = useState(true);
  const { handleDateClick } = useContext(PageContext)



  const formatRouteName = (route) => {
    if (route === "/") {
      return (
        <span
          className="text-blue-600 hover:underline cursor-pointer"
          onClick={() => handleDateClick({ email: email, navigate: '/', nextPrev: true })}
        >
          {email}
        </span>
      );
    }

    return route.split("/")[1].toUpperCase();
  };

  const resultTitle = formatRouteName(path);



  useEffect(() => {
    if (showNewEmailBanner) {
      showNewEmailToast({
        dispatch,
        navigate,
        handleClear,
        preferencesAction,
        unrepliedAction,
      });
    }
  }, [showNewEmailBanner]);

  useEffect(() => {
    const syncHandler = (event) => {
      if (typeof event.detail?.onboardingStep === "number") {
        setCrmOnboardingStep(event.detail.onboardingStep);
        setWebsiteDone(
          event.detail.onboardingStep >= ONBOARDING_STEP.WEBSITE_ADDED,
        );
      }
      if (event.detail?.status === "completed") {
        setFirstSyncRecordsSeen(false);
      }

      setFirstSyncState({
        status: event.detail?.status || "idle",
        result: event.detail?.result ?? null,
      });
    };

    window.addEventListener(FIRST_SYNC_EVENT, syncHandler);

    return () => {
      window.removeEventListener(FIRST_SYNC_EVENT, syncHandler);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadCrmOnboardingProgress = async () => {
      if (!crmEndpoint || !onboardingRecordName) {
        setCrmProgressLoading(false);
        return;
      }

      setCrmProgressLoading(true);
      try {
        const current = await fetchOnboardingProgress({
          crmEndpoint,
          name: onboardingRecordName,
        });
        const progress = current;
        if (ignore) return;

        setCrmOnboardingStep(progress.step);
        setWebsiteDone(progress.step >= ONBOARDING_STEP.WEBSITE_ADDED);
        if (progress.step >= ONBOARDING_STEP.FIRST_SYNC_DONE) {
          setFirstSyncRecordsSeen(true);
          setFirstSyncState({ status: "completed", result: null });
        }
      } catch (err) {
        console.error("Failed to load CRM onboarding progress:", err);
      } finally {
        if (!ignore) setCrmProgressLoading(false);
      }
    };

    loadCrmOnboardingProgress();

    return () => {
      ignore = true;
    };
  }, [crmEndpoint, onboardingRecordName]);

  const crmDomain = crmEndpoint
    ?.replace("https://", "")
    ?.replace("http://", "")
    ?.split("/")[0];
  const syncDone = crmOnboardingStep >= ONBOARDING_STEP.FIRST_SYNC_DONE;
  const contactCheckLoading = crmProgressLoading;
  const firstSyncLoading = firstSyncState?.status === "loading";
  const firstSyncCompleted = syncDone;
  const templateDone = crmOnboardingStep >= ONBOARDING_STEP.TEMPLATE_READY;
  const firstSyncRecords = Array.isArray(firstSyncState.result?.records)
    ? firstSyncState.result.records
    : [];
  const profileCompletion = firstSyncCompleted ? 100 : templateDone ? 85 : websiteDone ? 70 : 50;
  const showProfilePrompt =
    path !== "/profile" &&
    (profileCompletion < 100 || firstSyncLoading || contactCheckLoading);
  const showFirstSyncRecordsPrompt =
    path !== "/profile" &&
    firstSyncCompleted &&
    firstSyncRecords.length > 0 &&
    !firstSyncRecordsSeen;
  const profilePromptText = firstSyncLoading
    ? "First sync is running..."
    : contactCheckLoading
      ? "Loading onboarding status..."
      : firstSyncCompleted
        ? `Sync completed${firstSyncState.result?.count ? `: ${firstSyncState.result.count} records` : ""}`
        : websiteDone
          ? templateDone
            ? "Run first sync to unlock full setup"
            : "Save one template to continue setup"
          : "Complete your profile setup";
  const ProfileIcon = firstSyncLoading || contactCheckLoading
    ? Loader2
    : firstSyncCompleted
      ? CheckCircle2
      : UserCircle2;
  const handleShowFirstSyncRecords = () => {
    setFirstSyncRecordsSeen(true);
    navigate("/profile?showFirstSync=1");
  };

  return (
    <div
      data-tour="welcome-header"
      className="h-20 w-full relative overflow-visible rounded-3xl bg-white shadow-lg border border-gray-100 mb-5 flex items-center"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/80 via-purple-50/60 to-pink-50/80" />
      <div className="absolute top-0 left-0 w-32 h-32 bg-blue-200 rounded-full blur-3xl opacity-30" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-30" />



      <div className="relative z-10 w-full px-4 flex items-center justify-between gap-4">
        {/* LEFT */}
        <div className="flex items-center gap-5">
          {!isSearchActive && (
            <p className="text-xs font-medium text-gray-700 whitespace-nowrap">
              <span className="font-bold text-gray-900">Results for </span>
              <span className="font-bold text-gray-900">{resultTitle}</span>
            </p>
          )}

          {/* BADGES */}
          <div className="flex items-center gap-3">
            {crmDomain && (
              <div className="group flex items-center gap-2 px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-xl border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-400 cursor-pointer">
                <Link2 className="w-4 h-4 text-purple-600 group-hover:scale-125 transition-transform duration-300" />

                <span className="text-xs font-medium text-gray-700 max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-64 transition-all duration-600">
                  CRM:{" "}
                  <span className="font-bold text-purple-700">
                    {crmDomain?.split(".")[0]}
                  </span>
                </span>
              </div>
            )}

            {businessEmail && (
              <div className="group flex items-center gap-2 px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-400 cursor-pointer">
                <Mail className="w-4 h-4 text-blue-600 group-hover:scale-125 transition-transform duration-300" />

                <span className="text-xs font-medium text-gray-700 max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-80 transition-all duration-600">
                  Business Email:{" "}
                  <span className="font-bold text-blue-700">
                    {businessEmail}
                  </span>
                </span>
              </div>
            )}


          </div>

          {showProfilePrompt && contactCheckLoading ? (
            <ProfilePromptSkeleton />
          ) : showProfilePrompt ? (
            <Motion.button
              type="button"
              onClick={() => navigate("/profile")}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="
                group relative flex min-w-[255px] items-center gap-3 overflow-hidden rounded-2xl
                border border-indigo-200 bg-white/85 px-3 py-2 text-left shadow-lg
                shadow-indigo-500/10 backdrop-blur-xl transition-all
                hover:border-indigo-300 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/20
              "
            >
              <span className="absolute inset-x-0 bottom-0 h-1 bg-slate-100">
                <span
                  className={`block h-full rounded-full transition-all duration-700 ${contactCheckLoading
                    ? "animate-pulse bg-slate-300"
                    : "bg-gradient-to-r from-emerald-500 via-indigo-500 to-cyan-500"
                    }`}
                  style={{
                    width: contactCheckLoading
                      ? "35%"
                      : `${profileCompletion}%`,
                  }}
                />
              </span>

              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${firstSyncCompleted
                  ? "bg-emerald-500 shadow-emerald-500/25"
                  : "bg-gradient-to-br from-indigo-600 to-cyan-500 shadow-indigo-500/25"
                  }`}
              >
                <ProfileIcon
                  size={20}
                  className={
                    firstSyncLoading || contactCheckLoading
                      ? "animate-spin"
                      : ""
                  }
                />
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`block text-xs font-black uppercase tracking-wide ${firstSyncCompleted ? "text-emerald-600" : "text-indigo-600"
                    }`}
                >
                  {contactCheckLoading
                    ? "Checking setup"
                    : firstSyncCompleted
                      ? "Boom, completed"
                      : `Profile ${profileCompletion}%`}
                </span>
                <span className="block truncate text-sm font-bold text-slate-900">
                  {profilePromptText}
                </span>
              </span>

              {contactCheckLoading ? (
                <Loader2 size={18} className="shrink-0 animate-spin text-indigo-500" />
              ) : firstSyncCompleted ? (
                <PartyPopper size={18} className="shrink-0 text-emerald-500" />
              ) : (
                <ArrowRight
                  size={18}
                  className="shrink-0 text-indigo-500 transition-transform group-hover:translate-x-1"
                />
              )}
            </Motion.button>
          ) : null}

          {showFirstSyncRecordsPrompt && (
            <Motion.button
              type="button"
              onClick={handleShowFirstSyncRecords}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="
                group relative flex min-w-[220px] items-center gap-3 overflow-hidden rounded-2xl
                border border-emerald-200 bg-white/90 px-3 py-2 text-left shadow-lg
                shadow-emerald-500/10 backdrop-blur-xl transition-all
                hover:border-emerald-300 hover:bg-white hover:shadow-xl hover:shadow-emerald-500/20
              "
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                <List size={20} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-xs font-black uppercase tracking-wide text-emerald-600">
                  First Sync
                </span>
                <span className="block truncate text-sm font-bold text-slate-900">
                  Completed
                </span>
              </span>

              <ArrowRight
                size={18}
                className="shrink-0 text-emerald-500 transition-transform group-hover:translate-x-1"
              />
            </Motion.button>
          )}
        </div>

        {/* RIGHT */}

      </div>
    </div>
  );
};

export default WelcomeHeader;
