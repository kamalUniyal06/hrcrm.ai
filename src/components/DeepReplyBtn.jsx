import { MessageSquareTextIcon } from "lucide-react";

export const DeepReplyBtn = () => {
  const handleClick = () => {
    alert("This feature is coming soon!");
  };

  return (
    <div className="relative group">
      <button
        onClick={handleClick}
        className="
          flex items-center justify-center
          h-10 w-10
          rounded-full
          bg-gradient-to-r from-violet-600 to-indigo-600
          text-white
          shadow-md
          hover:shadow-xl
          hover:scale-105
          transition-all duration-200
          border border-white/20
        "
      >
        <MessageSquareTextIcon size={18} />
      </button>

      {/* Tooltip */}
      <div
        className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          opacity-0 group-hover:opacity-100
          pointer-events-none
          transition-opacity duration-200
          whitespace-nowrap
          px-3 py-2
          text-xs
          text-white
          bg-gray-900
          rounded-lg
          shadow-lg
          z-50
        "
      >
        DeepReply — Generate a detailed AI-powered reply
        <div
          className="
            absolute top-full left-1/2 -translate-x-1/2
            border-4 border-transparent border-t-gray-900
          "
        />
      </div>
    </div>
  );
};