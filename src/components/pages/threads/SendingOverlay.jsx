import { AnimatePresence, motion } from "framer-motion";

export const SendingOverlay = ({ sending }) => {
    return (
        <AnimatePresence>
            {sending && (
                <motion.div
                    initial={{ y: -80, opacity: 0 }}
                    animate={{ y: 20, opacity: 1 }}
                    exit={{ y: -80, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed top-10 right-1 -translate-x-1/2 z-[9999]"
                >
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg bg-slate-900 text-white">
                        <span className="text-sm font-medium">
                            Sending
                        </span>

                        {/* Animated dots */}
                        <div className="flex gap-1 mt-1">
                            {[0, 1, 2].map((i) => (
                                <motion.span
                                    key={i}
                                    animate={{
                                        opacity: [0.2, 1, 0.2],
                                        y: [0, -2, 0],
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        delay: i * 0.2,
                                    }}
                                    className="w-1.5 h-1.5 rounded-full bg-white"
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};