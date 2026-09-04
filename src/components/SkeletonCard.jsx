import { m } from "framer-motion";

export default function SkeletonCard() {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-[#0D0D0D] border border-gray-800 rounded-2xl p-5 shadow-lg"
    >
      <div className="animate-pulse space-y-4">
        <div className="h-5 bg-gray-700 rounded w-1/2"></div>

        <div className="flex gap-3">
          <div className="h-4 w-24 bg-gray-700 rounded-full"></div>
          <div className="h-4 w-20 bg-gray-700 rounded-full"></div>
        </div>

        <div className="space-y-2">
          <div className="h-4 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>

        <div className="h-10 bg-gray-700 rounded-xl mt-3"></div>
      </div>
    </m.div>
  );
}
