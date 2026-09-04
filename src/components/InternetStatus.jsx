import { useEffect, useRef, useState, useCallback } from "react";

const CHECK_INTERVAL = 5000; // Background health check while online
const PING_URL = "/favicon.ico"; // Swap for your backend health endpoint
const MAX_RETRY_DELAY = 30000; // Cap exponential backoff at 30s
const BASE_RETRY_DELAY = 3000;

// Quality tiers drive the signal-bar reading, not just a binary on/off
const QUALITY = {
    good: { label: "Strong connection", bars: 4 },
    fair: { label: "Weak connection", bars: 2 },
    poor: { label: "Poor connection", bars: 1 },
};

function classifyLatency(ms) {
    if (ms < 150) return "good";
    if (ms < 500) return "fair";
    return "poor";
}

export default function InternetStatus() {
    const [state, setState] = useState({
        status: "online", // online | offline
        visible: false,
        latency: null,
        quality: "good",
        retryAttempt: 0,
        retryIn: 0,
    });

    const hideTimeoutRef = useRef(null);
    const pollRef = useRef(null);
    const retryTimeoutRef = useRef(null);
    const countdownRef = useRef(null);
    const prevOnlineRef = useRef(true);

    const clearAllTimers = useCallback(() => {
        clearTimeout(hideTimeoutRef.current);
        clearTimeout(retryTimeoutRef.current);
        clearInterval(countdownRef.current);
    }, []);

    // Measures reachability AND round-trip time in one shot
    const pingOnce = useCallback(async () => {
        const start = performance.now();
        try {
            await fetch(PING_URL, { method: "HEAD", cache: "no-store" });
            return { ok: true, latency: Math.round(performance.now() - start) };
        } catch {
            return { ok: false, latency: null };
        }
    }, []);

    const startRetryCycle = useCallback(
        (attempt) => {
            clearTimeout(retryTimeoutRef.current);
            clearInterval(countdownRef.current);

            const delay = Math.min(BASE_RETRY_DELAY * 2 ** attempt, MAX_RETRY_DELAY);
            let remaining = Math.round(delay / 1000);

            setState((s) => ({ ...s, retryAttempt: attempt + 1, retryIn: remaining }));

            countdownRef.current = setInterval(() => {
                remaining -= 1;
                setState((s) => ({ ...s, retryIn: Math.max(remaining, 0) }));
            }, 1000);

            retryTimeoutRef.current = setTimeout(async () => {
                clearInterval(countdownRef.current);
                const result = await pingOnce();
                if (result.ok && navigator.onLine) {
                    goOnline(result.latency);
                } else {
                    startRetryCycle(attempt + 1);
                }
            }, delay);
        },
        [pingOnce]
    );

    const goOffline = useCallback(() => {
        clearAllTimers();
        prevOnlineRef.current = false;
        setState((s) => ({
            ...s,
            status: "offline",
            visible: true,
            retryAttempt: 0,
        }));
        startRetryCycle(0);
    }, [clearAllTimers, startRetryCycle]);

    const goOnline = useCallback(
        (latency) => {
            clearAllTimers();
            prevOnlineRef.current = true;
            setState((s) => ({
                ...s,
                status: "online",
                visible: true,
                latency,
                quality: classifyLatency(latency ?? 999),
                retryAttempt: 0,
                retryIn: 0,
            }));
            hideTimeoutRef.current = setTimeout(() => {
                setState((s) => ({ ...s, visible: false }));
            }, 3000);
        },
        [clearAllTimers]
    );

    const runCheck = useCallback(async () => {
        if (!navigator.onLine) {
            if (prevOnlineRef.current) goOffline();
            return;
        }
        const result = await pingOnce();
        if (result.ok) {
            if (!prevOnlineRef.current) {
                goOnline(result.latency);
            } else {
                setState((s) => ({
                    ...s,
                    latency: result.latency,
                    quality: classifyLatency(result.latency),
                }));
            }
        } else if (prevOnlineRef.current) {
            goOffline();
        }
    }, [pingOnce, goOffline, goOnline]);

    const retryNow = useCallback(() => {
        clearTimeout(retryTimeoutRef.current);
        clearInterval(countdownRef.current);
        (async () => {
            const result = await pingOnce();
            if (result.ok && navigator.onLine) {
                goOnline(result.latency);
            } else {
                startRetryCycle(state.retryAttempt);
            }
        })();
    }, [pingOnce, goOnline, startRetryCycle, state.retryAttempt]);

    useEffect(() => {
        prevOnlineRef.current = navigator.onLine;
        runCheck();

        window.addEventListener("online", runCheck);
        window.addEventListener("offline", goOffline);
        pollRef.current = setInterval(runCheck, CHECK_INTERVAL);

        return () => {
            window.removeEventListener("online", runCheck);
            window.removeEventListener("offline", goOffline);
            clearInterval(pollRef.current);
            clearAllTimers();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!state.visible) return null;

    const isOffline = state.status === "offline";
    const activeBars = isOffline ? 0 : QUALITY[state.quality].bars;

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] animate-[dropIn_.35s_cubic-bezier(0.16,1,0.3,1)]">
            <div
                role="status"
                aria-live="polite"
                className={`
          flex items-center gap-3 rounded-2xl pl-3 pr-4 py-2.5
          backdrop-blur-md border
          ${isOffline
                        ? "bg-[#1C1F26]/95 border-rose-500/30"
                        : "bg-[#1C1F26]/95 border-emerald-400/30"
                    }
        `}
                style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}
            >
                {/* Signature element: live signal-strength bars */}
                <div className="flex items-end gap-[3px] h-4" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                        <span
                            key={i}
                            className={`
                w-[3px] rounded-full transition-all duration-500
                ${i < activeBars
                                    ? isOffline
                                        ? "bg-rose-400"
                                        : "bg-emerald-400"
                                    : "bg-white/15"
                                }
                ${!isOffline && i < activeBars ? "animate-[pulseBar_1.4s_ease-in-out_infinite]" : ""}
              `}
                            style={{
                                height: `${(i + 1) * 3 + 4}px`,
                                animationDelay: `${i * 120}ms`,
                            }}
                        />
                    ))}
                </div>

                <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-medium text-white">
                        {isOffline ? "You're offline" : "Back online"}
                    </span>
                    <span
                        className="text-[11px] text-white/50"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {isOffline
                            ? state.retryIn > 0
                                ? `Retrying in ${state.retryIn}s · attempt ${state.retryAttempt}`
                                : "Retrying now..."
                            : state.latency != null
                                ? `${QUALITY[state.quality].label} · ${state.latency}ms`
                                : "Connection restored"}
                    </span>
                </div>

                {isOffline && (
                    <button
                        onClick={retryNow}
                        className="ml-1 text-[11px] font-medium text-white/80 hover:text-white
                       border border-white/15 hover:border-white/30 rounded-lg
                       px-2.5 py-1 transition-colors"
                    >
                        Retry now
                    </button>
                )}
            </div>

            <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulseBar {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[dropIn_\\.35s_cubic-bezier\\(0\\.16\\,1\\,0\\.3\\,1\\)\\] { animation: none; }
        }
      `}</style>
        </div>
    );
}