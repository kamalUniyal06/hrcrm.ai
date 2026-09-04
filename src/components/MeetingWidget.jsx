import React, { useState, useEffect, useRef } from "react";

const MeetingWidget = () => {
  const hour = new Date().getHours();
  const [state, setState] = useState(() => {
    return localStorage.getItem("gpc-widget-state") || "open";
  });
  const widgetRef = useRef(null);

  const updateState = (newState) => {
    localStorage.setItem("gpc-widget-state", newState);
    setState(newState);
  };

  useEffect(() => {
    if (state !== "open") return;
    const handler = (e) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) {
        updateState("mini");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [state]);

  if (hour < 9 || hour >= 18) return null;
  if (state === "gone") return null;

  return (
    <>
      <style>{`
        @keyframes gpcFadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes gpcPopIn  { from { opacity:0; transform:scale(0.6); }       to { opacity:1; transform:scale(1); } }
        @keyframes gpcPulse  { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        .gpc-widget { animation: gpcFadeUp 0.35s ease; }
        .gpc-pill-wrap { animation: gpcPopIn 0.25s ease; }
        .gpc-dot { animation: gpcPulse 2s infinite; }
        .gpc-pill-x { opacity: 0; transform: scale(0.7); transition: opacity 0.15s ease, transform 0.15s ease; }
        .gpc-pill-wrap:hover .gpc-pill-x { opacity: 1; transform: scale(1); }
      `}</style>

      {/* ── Avatar pill (minimized) ── */}
      {state === "mini" && (
        <div
          className="gpc-pill-wrap"
          style={{
            position: "fixed",
            bottom: 5,
            left: 60,
            zIndex: 9999,
            width: 56,
            height: 56,
          }}
        >
          <button
            onClick={() => updateState("open")}
            title="Talk to GPC Expert"
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "3px solid #16a34a",
              background: "#fff",
              padding: 0,
              overflow: "hidden",
              cursor: "pointer",
              display: "block",
            }}
          >
            <img
              src="https://www.guestpostcrm.com/wp-content/uploads/2026/06/G-Bot-5-1.png"
              alt="Ask GPC"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                pointerEvents: "none",
              }}
              draggable={false}
            />
          </button>

          <span style={{
            position: "absolute",
            bottom: 2,
            left: 2,
            width: 12,
            height: 12,
            background: "#4ade80",
            borderRadius: "50%",
            border: "2px solid #fff",
            pointerEvents: "none",
          }} />

          <button
            className="gpc-pill-x"
            onClick={(e) => {
              e.stopPropagation();
              updateState("gone");
            }}
            aria-label="Dismiss"
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#ef4444",
              border: "2px solid #fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              zIndex: 1,
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="7" y2="7" />
              <line x1="7" y1="1" x2="1" y2="7" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Full widget ── */}
      {state === "open" && (
        <div
          ref={widgetRef}
          className="gpc-widget fixed bottom-6 left-5 z-[9999] w-[300px] rounded-[20px] overflow-hidden bg-white shadow-2xl"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          <div className="bg-green-600 px-4 py-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                src="https://www.guestpostcrm.com/wp-content/uploads/2026/06/G-Bot-5-1.png"
                alt=""
                className="w-8 h-8 object-contain"
                draggable={false}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="m-0 text-[13px] font-semibold text-white leading-tight">Ask GPC</p>
              <p className="m-0 mt-0.5 text-[11px] text-white/80 flex items-center gap-1.5">
                <span className="gpc-dot w-1.5 h-1.5 bg-green-300 rounded-full inline-block flex-shrink-0" />
                Online now
              </p>
            </div>
            <span className="bg-white/20 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap">
              FREE
            </span>
            <button
              onClick={() => updateState("mini")}
              aria-label="Close"
              className="w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-white/40 transition-colors duration-150"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11" />
                <line x1="11" y1="1" x2="1" y2="11" />
              </svg>
            </button>
          </div>

          <div className="p-4">
            <p className="m-0 mb-1 text-[15px] font-bold text-gray-900">Get a free 1-on-1 session</p>
            <p className="m-0 mb-3.5 text-[13px] text-gray-500 leading-relaxed">
              Our expert walks you through guest posting, pricing &amp; metrics — live, in real time.
            </p>
            <div className="flex items-center gap-2.5 mb-3.5 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
              <svg width="16" height="16" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div>
                <p className="m-0 text-[12px] font-semibold text-green-700">Today, 9 AM – 6 PM</p>
                <p className="m-0 text-[11px] text-green-800/70">Available right now</p>
              </div>
            </div>
            <a
              href="https://meet.google.com/hdt-qyws-imo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white no-underline px-4 py-[11px] rounded-xl text-[14px] font-semibold transition-colors duration-200"
            >
              <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
              Join meeting now →
            </a>
            <p className="mt-2.5 mb-0 text-[11px] text-center text-gray-400">
              No sign-up needed · Opens in Google Meet
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default MeetingWidget;