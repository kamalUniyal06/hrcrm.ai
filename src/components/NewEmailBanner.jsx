import { motion, AnimatePresence } from "framer-motion";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";

export default function NewEmailBanner({ show }) {
    const [timeLeft, setTimeLeft] = useState(3);

    useEffect(() => {
        if (!show) return;

        setTimeLeft(3); // reset every time banner shows

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [show]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center
                     backdrop-blur-sm bg-black/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 250, damping: 22 }}
                        className="bg-white rounded-2xl shadow-2xl
                       px-8 py-6 flex items-center gap-4
                       border border-gray-200"
                    >
                        {/* 🔔 Animated Mail Icon */}
                        <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100"
                        >
                            <Mail className="w-6 h-6 text-blue-600" />
                        </motion.div>

                        {/* Text */}
                        <div>
                            <p className="text-lg font-semibold text-gray-800">
                                New Email Received
                            </p>
                            <p className="text-sm text-gray-500">
                                Redirecting to latest email...
                            </p>
                        </div>

                        {/* ⏱️ Countdown */}
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={timeLeft}
                                initial={{ y: -8, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 8, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="ml-4 text-sm font-mono text-gray-700
                           bg-gray-100 px-3 py-1 rounded-full min-w-[32px] text-center"
                            >
                                {timeLeft}s
                            </motion.span>
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
