// ThreadSkeleton.jsx
import { motion } from "framer-motion";

export function ThreadSkeleton() {
    const dotVariant = {
        animate: {
            y: [0, -8, 0],
        },
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 gap-6">

            {/* Spinner */}
            <motion.div
                className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />

            {/* Loading text */}
            <div className="flex items-center gap-2 text-gray-600 text-lg font-medium">
                Loading Thread...

            </div>

        </div>
    );
}