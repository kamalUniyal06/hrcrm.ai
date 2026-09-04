import { X, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const Avatar = ({ setShowAvatar, avatarUrl, mute = false }) => {
  const [hover, setHover] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const [muted, setMuted] = useState(mute);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (
        !enlarged &&
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setShowAvatar(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [enlarged, setShowAvatar]);

  // Toggle enlarge without restarting video
  const toggleEnlarge = () => {
    setEnlarged((prev) => !prev);

    // Keep same muted state on enlarge/minimize
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  };

  // Toggle mute button
  const toggleMute = () => {
    const newMute = !muted;
    setMuted(newMute);
    if (videoRef.current) {
      videoRef.current.muted = newMute;
    }
  };

  return (
    <>
      {/* SMALL BUBBLE (Hidden when enlarged) */}
      {!enlarged && (
        <div
          className="fixed bottom-10 right-5 z-50 transition-all duration-300"
          ref={containerRef}
        >
          <div
            className="relative inline-block"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            <video
              ref={videoRef}
              src={`https://${avatarUrl}`}
              autoPlay
              playsInline
              muted={muted}
              className="w-52 h-52 rounded-full object-cover shadow-xl border-4 border-white transition-all duration-300"
            />
            {/* BUTTONS */}
            <div
              className={`absolute top-2 right-2 flex gap-2 transition-opacity duration-200 ${
                hover ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Mute / Unmute */}
              <button
                onClick={toggleMute}
                className="bg-white text-gray-700 rounded-full p-2 shadow-md hover:bg-gray-200 transition"
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              {/* Enlarge */}
              <button
                onClick={toggleEnlarge}
                className="bg-white text-gray-700 rounded-full p-2 shadow-md hover:bg-gray-200 transition"
              >
                <Maximize2 size={18} />
              </button>

              {/* Close */}
              <button
                onClick={() => setShowAvatar(false)}
                className="bg-red-500 text-white rounded-full p-2 shadow-md hover:bg-red-600 transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN MODE */}
      {enlarged && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] transition-all duration-300">
          <div className="relative w-[90%] max-w-4xl">
            <video
              ref={videoRef}
              src={`https://${avatarUrl}`}
              autoPlay
              loop
              controls
              muted={muted}
              className="w-full rounded-xl shadow-xl transition-all duration-300"
            />

            {/* BUTTON GROUP (Top Right) */}
            <div className="absolute -top-4 -right-4 flex gap-3">
              <button
                onClick={toggleMute}
                className="bg-white text-gray-700 rounded-full p-3 shadow-lg hover:bg-gray-200 transition"
              >
                {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>

              <button
                onClick={toggleEnlarge}
                className="bg-white text-gray-700 rounded-full p-3 shadow-lg hover:bg-gray-200 transition"
              >
                <Minimize2 size={22} />
              </button>

              <button
                onClick={() => setShowAvatar(false)}
                className="bg-red-500 text-white rounded-full p-3 shadow-lg hover:bg-red-600 transition"
              >
                <X size={22} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Avatar;
