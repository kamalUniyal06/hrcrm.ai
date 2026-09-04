import { images } from "../assets/assets";
import { useNavigate } from "react-router-dom";


const SocialButtons = ({ displayCount, trust_score }) => {
  const navigate = useNavigate();
  return (
    <div className="ml-0 flex min-w-0 flex-wrap items-center gap-2">

      {/* DUPLICATE BUTTON WITH BADGE */}
      {displayCount > 0 && (
        <button
          className="relative shrink-0 cursor-pointer rounded-full p-1 hover:scale-105"
          onClick={() => navigate("/duplicates")}
        >
          <img
            width="42"
            height="42"
            src={images.duplicateImg}
            alt="duplicate count"
          />

          <div
            className={`
            absolute top-1 right-3
            bg-red-500 text-white text-xs font-medium
            rounded-full w-4 h-4 p-1
            flex items-center justify-center
            transition-all duration-300 ease-out
           
          `}
          >
            {displayCount > 99
              ? "99+"
              : displayCount}
          </div>

          {displayCount === 0 && (
            <div
              className="
            absolute top-2 right-3
            bg-gray-300 text-gray-700 text-xs font-medium
            rounded-full w-4 h-4
            flex items-center justify-center
          "
            >
              0
            </div>
          )}
        </button>
      )}

      <button className="group flex min-h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#F7890B] px-2 py-1 text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg">
        <span className="whitespace-nowrap text-xs font-small tracking-wide sm:text-sm">Trust Score:</span>

        <span className="whitespace-nowrap rounded-full text-xs font-small backdrop-blur-sm sm:text-sm">
          {trust_score == "unverified"
            ? "50%"
            : trust_score}
        </span>
      </button>
    </div>
  );
};

export default SocialButtons;