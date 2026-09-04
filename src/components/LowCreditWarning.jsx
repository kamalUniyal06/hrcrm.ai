import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import rechargeImg from "../assets/recharge.jpg";

export default function LowCreditWarning({
    open,
    onClose,
    score,
}) {
    const navigate = useNavigate();

    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 30 }}
                    transition={{ duration: 0.25 }}
                    className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
                >
                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-full p-2 hover:bg-gray-100"
                    >
                        <X size={18} />
                    </button>

                    {/* Image */}
                    <div className="flex justify-center pt-8">
                        <img
                            src={rechargeImg}
                            alt="Recharge Wallet"
                            className="w-72 object-contain"
                        />
                    </div>

                    {/* Content */}
                    <div className="px-8 pb-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
                            <AlertTriangle
                                size={28}
                                className="text-yellow-600"
                            />
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900">
                            Low AI Credits
                        </h2>

                        <p className="mt-3 text-gray-600 leading-7">
                            You currently have
                            <span className="font-bold text-red-600">
                                {" "}
                                {score} credits
                            </span>{" "}
                            remaining.
                        </p>

                        <p className="mt-2 text-sm text-gray-500">
                            Recharge your wallet to continue generating AI
                            replies, summaries and other AI powered features
                            without interruption.
                        </p>

                        <button
                            onClick={() => {
                                navigate("/plans");
                                onClose()
                            }}
                            className="mt-8 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white transition hover:scale-[1.02]"
                        >
                            Recharge Wallet
                        </button>

                        <button
                            onClick={onClose}
                            className="mt-3 w-full rounded-xl border border-gray-200 py-3 font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                            Maybe Later
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}