import { motion } from "framer-motion";
export function ViewButton({ children, Icon, onClick }) {
  return (
    <div className="relative">
      {children}
      {Icon && ( // ✅ Only render if Icon exists
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClick}
          className="
  bg-white/70 dark:bg-black/40
  backdrop-blur-md
  text-gray-900 dark:text-white
  p-1 rounded-2xl
  shadow-lg hover:shadow-xl
  transition-all duration-200
  flex items-center w-fit
 cursor-pointer 
"
        >
          <Icon className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
