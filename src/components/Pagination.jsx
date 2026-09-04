import { m } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

function Pagination({ slice, fn, pageCount, pageIndex }) {
  const [gotoValue, setGotoValue] = useState("");
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [pageIndex]);

  const handlePrev = () => {
    if (pageIndex > 1) {
      fn(pageIndex - 1);
    }
  };

  const handleNext = () => {
    if (pageIndex < pageCount) {
      fn(Number(pageIndex) + 1);
    }
  };

  const goToPage =
    (p) => {
      fn(p);
    };

  // --- Build pagination numbers ---
  const pagesToShow = [];

  let start = Number(pageIndex);
  let end = Number(pageIndex) + 2;

  if (end > pageCount) {
    end = pageCount;
  }

  for (let i = start; i <= end; i++) {
    pagesToShow.push(i);
  }

  if (end < pageCount - 1) {
    pagesToShow.push("ellipsis");
    pagesToShow.push(pageCount);
  }

  // --- Handle 'Go to Page' Enter key ---
  const handleGoto = (e) => {
    if (e.key === "Enter") {
      const p = Number(gotoValue);

      if (p >= 1 && p <= pageCount) {
        goToPage(p);
        setGotoValue("");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      {/* Pagination Buttons */}
      <div className="flex items-center justify-center gap-6">
        {/* Left Arrow */}
        <button
          onClick={handlePrev}
          disabled={pageIndex == 1}
          className={`text-cyan-500 hover:text-cyan-700 transition text-3xl 
          ${pageIndex == 1 ? "opacity-0" : "cursor-pointer"}
        `}
        >
          <ChevronLeft />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-4">
          {pagesToShow.map((p, idx) =>
            p == "ellipsis" ? (
              <span key={idx} className="text-2xl text-gray-500 px-2">
                …
              </span>
            ) : (
              <button
                key={p * Math.random()}
                onClick={() => goToPage(p)}
                className={`w-8 h-8 flex items-center justify-center cursor-pointer rounded-full text-lg font-semibold transition
                ${p == pageIndex
                    ? "bg-cyan-600 text-white scale-110 shadow-md"
                    : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                  }
              `}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Right Arrow */}
        <button
          onClick={handleNext}
          disabled={pageIndex == pageCount}
          className={`text-cyan-500 hover:text-cyan-700 transition text-3xl 
          ${pageIndex == pageCount ? "opacity-0" : "cursor-pointer"}
        `}
        >
          <ChevronRight />
        </button>
      </div>

      {/* Go To Page Input */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          max={pageCount}
          value={gotoValue}
          onChange={(e) => setGotoValue(e.target.value)}
          onKeyDown={handleGoto}
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-cyan-500"
          placeholder="Go to..."
        />
      </div>
    </div>
  );
}

export default memo(Pagination);
