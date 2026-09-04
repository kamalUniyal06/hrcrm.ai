import { ArrowLeftCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Header = ({ text, handleCreate }) => {
  return (
    <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
      {/* LEFT: Back Button + Title */}
      <div className="flex min-w-0 flex-1 gap-2 sm:gap-3 items-center">
        <Link to={-1} aria-label="Back" className="shrink-0 hover:scale-110 transition">
          <ArrowLeftCircle />
        </Link>

        <h1 title={text} className="min-w-0 truncate text-lg sm:text-2xl font-semibold">
          {text}
        </h1>
      </div>

      {/* RIGHT: Create Button */}
      {handleCreate && (
        <button
          onClick={handleCreate}
          aria-label="Create"
          className="shrink-0 p-2 sm:p-5 cursor-pointer hover:scale-110 flex items-center justify-center transition"
        >
          <img
            width="36"
            height="36"
            src="https://img.icons8.com/arcade/64/plus.png"
            alt=""
            className="h-8 w-8 sm:h-9 sm:w-9"
          />
        </button>
      )}
    </div>
  );
};

export default Header;
