import { useState } from "react";

export const Titletooltip = ({ content, children }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: rect.left + rect.width / 2, // center of element
      y: rect.bottom + window.scrollY + 10 // 10px below element
    });
    setShow(true);
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  return (
    <div className="relative inline-block w-full">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full cursor-pointer"
      >
        {children}
      </div>
      {show && content && (
        <div 
          className="fixed z-[99999] bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm rounded-xl py-3 px-4 whitespace-normal max-w-xs break-words shadow-2xl border border-white/20 backdrop-blur-sm"
          style={{
            left: `${coords.x}px`,
            top: `${coords.y}px`,
            transform: 'translateX(-50%)' // center align horizontally
          }}
        >
          <div className="flex-1 text-sm leading-relaxed font-medium">
            {content}
          </div>
          {/* Top arrow pointing to the element */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-b-blue-600 border-t-0" />
        </div>
      )}
    </div>
  );
};