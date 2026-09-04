// components/CopyButton.jsx
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { motion, AnimatePresence, time } from "framer-motion";

export default function CopyButton({ text, title = '' }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);

        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <button
            onClick={handleCopy}
            title={title}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition shadow-sm relative overflow-hidden cursor-pointer"
        >
            <AnimatePresence mode="wait">
                {copied ? (
                    <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -90, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0, rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Check className="w-4 h-4 " />
                    </motion.div>
                ) : (
                    <motion.div
                        key="copy"
                        initial={{ scale: 0, rotate: 90, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0, rotate: -90, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Copy className="w-4 h-4" />
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
    );
}