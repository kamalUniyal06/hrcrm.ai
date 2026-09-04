import { motion } from "framer-motion";
import {logo} from "../../assets/assets";

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-100 to-white flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-8">
        {/* Rotating Logo */}
        <motion.img
          src={logo}
          alt="logo"
          className="w-40 h-40 object-contain"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
        />

        {/* Text Content */}
        <div className="flex flex-col items-center gap-4">

          {/* Animated Dots */}
          <div className="flex gap-2 mt-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-blue-500 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>

        <motion.h2
          className="text-md font-semibold text-gray-800"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Loading
        </motion.h2>
      </div>
    </div>
  );
}
