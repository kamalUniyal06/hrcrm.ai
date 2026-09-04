import { useContext, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, Clock3, X } from "lucide-react";
import { PageContext } from "../context/pageContext";

const REMINDER_TIME = 15 * 60 * 1000;
// const REMINDER_TIME = 0.1 * 60 * 1000;

export default function RefreshReminder() {
    const { showRefreshReminder: open, setShowRefreshReminder: setOpen } = useContext(PageContext);
    const timerRef = useRef();

    const startTimer = () => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setOpen(true);
        }, REMINDER_TIME);
    };

    useEffect(() => {
        startTimer();
        return () => clearTimeout(timerRef.current);
    }, []);

    const handleLater = () => {
        setOpen(false);
        startTimer();
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed inset-x-0 top-0 z-[999999] flex justify-center px-2 pt-2 sm:px-4 sm:pt-3"
                >
                    <div className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow-xl shadow-slate-900/10 backdrop-blur-xl sm:rounded-2xl">
                        {/* subtle top accent line */}
                        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-400" />

                        <div className="flex flex-col gap-2.5 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-3.5">
                            <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
                                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/25 sm:h-10 sm:w-10 sm:rounded-xl">
                                    <Clock3 className="h-4 w-4 text-white sm:h-5 sm:w-5" strokeWidth={2} />
                                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                                        <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-500" />
                                    </span>
                                </div>

                                <div className="min-w-0">
                                    <div className="text-[13px] font-semibold text-slate-900 sm:text-sm">
                                        Refresh recommended
                                    </div>
                                    <p className="text-xs text-slate-500 sm:text-sm">
                                        You've been running for a while — refresh to keep things fast and in sync.
                                    </p>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center justify-end gap-2">
                                <button
                                    onClick={handleLater}
                                    className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 sm:px-3.5 sm:py-2 sm:text-sm"
                                >
                                    Later
                                </button>

                                <button
                                    onClick={handleRefresh}
                                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 px-3.5 py-1.5 text-[13px] font-medium text-white shadow-sm transition hover:shadow-md hover:brightness-110 active:scale-[0.98] sm:px-4 sm:py-2 sm:text-sm"
                                >
                                    <RefreshCw size={14} />
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}