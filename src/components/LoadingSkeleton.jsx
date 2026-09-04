import React from "react";

const LoadingSkeleton = () => {
  return (
    <div className="p-6 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-400 animate-pulse rounded-full"></div>
          <div className="space-y-2">
            <div className="w-40 h-4 bg-gray-400 rounded animate-pulse"></div>
            <div className="w-24 h-3 bg-gray-400 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-20 h-8 bg-gray-400 rounded animate-pulse"></div>
          <div className="w-10 h-5 bg-gray-400 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="h-40 bg-gray-400 animate-pulse rounded-xl"></div>
        <div className="h-40 bg-gray-400 animate-pulse rounded-xl"></div>
      </div>

      {/* Buttons Skeleton */}
      <div className="flex gap-3 mt-6">
        <div className="h-10 w-32 bg-gray-400 rounded-lg animate-pulse"></div>
        <div className="h-10 w-32 bg-gray-400 rounded-lg animate-pulse"></div>
        <div className="h-10 w-24 bg-gray-400 rounded-lg animate-pulse"></div>
        <div className="h-10 w-32 bg-gray-400 rounded-lg animate-pulse"></div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;
