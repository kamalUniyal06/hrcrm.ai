import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Sparkles, UserCircle2 } from "lucide-react";
import GuidedWalkthrough from "./GuidedWalkthrough";
import { fetchOnboardingStatus } from "../utils/onboardingCompletion";

const FIRST_SYNC_EVENT = "guestpostcrm:first-sync";

const OnBoarding = () => {
    const [showOnboardingPopup, setShowOnboardingPopup] = useState(false);
    const [loadingAction, setLoadingAction] = useState(null);
    const [showGuidedWalkthrough, setShowGuidedWalkthrough] =
        useState(false);
    const [isSignupChecking, setIsSignupChecking] = useState(true);
const [isSignupIncomplete, setIsSignupIncomplete] = useState(false);
    const guidedWalkthroughShownRef = useRef(false);

    const navigate = useNavigate();

    const {
        user,
        businessEmail,
        isAuthenticated,
    } = useSelector((state) => state.user);

       const searchParams = new URLSearchParams(window.location.search);
    const email = searchParams.get("email");

    const isRootEmailUrl =
        window.location.pathname === "/" && !!email;
 
    const onboardingEmail =
        businessEmail ||
        user?.email ||
        user?.email1 ||
        user?.email_address ||
        email;

    useEffect(() => {
    if (!isAuthenticated) return;

    const checkSignupEntry = async () => {
        if (!onboardingEmail) {
            setIsSignupChecking(false);
            return;
        }

        try {
            setIsSignupChecking(true);

            const progress = await fetchOnboardingStatus(onboardingEmail);

            setIsSignupIncomplete(progress.signupIncomplete);
            window.dispatchEvent(
                new CustomEvent(FIRST_SYNC_EVENT, {
                    detail: {
                        onboardingStep: progress.step,
                        websiteDone: progress.step >= 1,
                    },
                }),
            );
        } catch (error) {
            console.error("Signup onboarding check failed", error);
            setIsSignupIncomplete(true);
        } finally {
            setIsSignupChecking(false);
        }
    };

    checkSignupEntry();
}, [isAuthenticated, onboardingEmail]);

    // Show onboarding popup
    useEffect(() => {
        if (!isAuthenticated) return;

        if (isRootEmailUrl) {
            const alreadyShown =
                sessionStorage.getItem("onboardingShown");
 
            if (!alreadyShown) {
                setShowOnboardingPopup(true);
                sessionStorage.setItem("onboardingShown", "true");
            }
        }
    }, [isAuthenticated, isRootEmailUrl]);

    // Guided walkthrough
    useEffect(() => {
        if (!isAuthenticated) return;

        const syncHandler = (event) => {
            if (
                event.detail?.status === "completed" &&
                !guidedWalkthroughShownRef.current
            ) {
                guidedWalkthroughShownRef.current = true;
                setShowGuidedWalkthrough(true);
            }
        };

        window.addEventListener(FIRST_SYNC_EVENT, syncHandler);

        return () => {
            window.removeEventListener(
                FIRST_SYNC_EVENT,
                syncHandler
            );
        };
    }, [isAuthenticated]);

    const closeGuidedWalkthrough = () => {
        setShowGuidedWalkthrough(false);
    };

    const hitTryNowEndpoint = async () => {
        if (!email) return;

        await fetch(
            `https://crm.outrightsystems.org/index.php?entryPoint=trynow&email=${encodeURIComponent(
                email
            )}&sync=1`,
            {
                method: "GET",
                mode: "no-cors",
                cache: "no-store",
            }
        ).catch(() => { });
    };

    const redirectToDomainWithEmail = () => {
        window.location.assign(
            `${window.location.origin}?email=${encodeURIComponent(
                email
            )}`
        );
    };

    const handleCompleteProfile = async () => {
        try {
            setLoadingAction("complete");

            await hitTryNowEndpoint();

            setShowOnboardingPopup(false);

            // Complete profile specific action
            redirectToDomainWithEmail();
        } finally {
            setLoadingAction(null);
        }
    };

    const handleSkipForNow = async () => {
        try {
            setLoadingAction("skip");

            await hitTryNowEndpoint();

            setShowOnboardingPopup(false);

            // Skip specific action
            redirectToDomainWithEmail();
        } finally {
            setLoadingAction(null);
        }
    };

   if (!isAuthenticated) return null;

if (isSignupChecking) {
    return null;
}

if (isSignupIncomplete) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-100 p-8 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M10.29 3.86l-8 14A1 1 0 003.14 19h17.72a1 1 0 00.85-1.51l-8-14a1 1 0 00-1.72 0z"
                        />
                    </svg>
                </div>

                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Signup Incomplete
                </h2>

                <p className="text-gray-600 text-base leading-relaxed mb-8">
                    Your account setup isn't finished yet. Complete your signup
                    process to access all features of GuestPostCRM.
                </p>

                <a
                    href="https://www.guestpostcrm.com/rightee/google.php"
                    className="inline-flex items-center justify-center w-full rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold shadow-lg transition-all duration-200 hover:bg-blue-700 hover:shadow-xl"
                >
                    Complete Signup →
                </a>

                <p className="mt-4 text-sm text-gray-400">
                    It only takes a minute.
                </p>
            </div>
        </div>
    );
}

    return (
        <>
            {/* ONBOARDING POPUP */}
            {showOnboardingPopup && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div
                        className="
              relative w-full max-w-md
              rounded-3xl overflow-hidden
              bg-white shadow-2xl
              border border-white/50
              animate-in fade-in zoom-in duration-300
            "
                    >
                        {/* TOP */}
                        <div className="h-28 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 relative">
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                                <div
                                    className="
                    w-20 h-20 rounded-full
                    bg-white shadow-xl
                    flex items-center justify-center
                    border-4 border-white
                  "
                                >
                                    <UserCircle2 className="w-12 h-12 text-violet-500" />
                                </div>
                            </div>
                        </div>

                        {/* CONTENT */}
                        <div className="pt-14 pb-8 px-8 text-center">
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <Sparkles className="text-yellow-500 w-5 h-5" />

                                <h2 className="text-2xl font-bold text-gray-800">
                                    Welcome 🎉
                                </h2>
                            </div>

                            <p className="text-gray-600 text-sm leading-relaxed">
                                Your account has been successfully created.
                                <br />
                                Complete your onboarding to personalize your
                                profile and start using all features.
                            </p>

                            {email && (
                                <div
                                    className="
                    mt-5 px-4 py-3 rounded-2xl
                    bg-violet-50 border border-violet-100
                  "
                                >
                                    <p className="text-xs text-violet-500 font-medium mb-1">
                                        Logged in as
                                    </p>

                                    <p className="text-sm font-bold text-violet-700 break-all">
                                        {email}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleCompleteProfile}
                                disabled={loadingAction !== null}
                                className="
        mt-6 w-full py-3.5 rounded-2xl
        bg-gradient-to-r from-violet-600 to-fuchsia-600
        text-white font-semibold
        shadow-lg shadow-violet-200
        hover:shadow-xl hover:scale-[1.02]
        transition-all duration-300
        disabled:opacity-80 disabled:cursor-not-allowed
    "
                            >
                                {loadingAction === "complete" ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Completing...
                                    </div>
                                ) : (
                                    "Complete Profile"
                                )}
                            </button>

                            <button
                                onClick={handleSkipForNow}
                                disabled={loadingAction !== null}
                                className={`
        mt-3 w-full py-3 rounded-2xl
        border border-gray-200
        bg-gray-50
        text-gray-600
        font-medium
        transition-all duration-300
        ${loadingAction === null
                                        ? "hover:bg-gray-100 hover:border-gray-300"
                                        : "opacity-60 cursor-not-allowed"
                                    }
    `}
                            >
                                {loadingAction === "skip" ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-500 rounded-full animate-spin" />
                                        Skipping...
                                    </div>
                                ) : (
                                    "Skip for now"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <GuidedWalkthrough
                open={showGuidedWalkthrough}
                onClose={closeGuidedWalkthrough}
                navigate={navigate}
            />
        </>
    );
};

export default OnBoarding;
