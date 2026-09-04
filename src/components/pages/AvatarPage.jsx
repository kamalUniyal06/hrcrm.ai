import React, { useState } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AvatarPage = () => {
  const { avatars, loading } = useSelector((state) => state.avatar);
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalUrl, setModalUrl] = useState(null);

  const [playing, setPlaying] = useState({});

  const togglePlay = (id) =>
    setPlaying((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="p-8 min-h-screen">
      {/* BACK BUTTON */}
      <motion.button
        whileHover={{ scale: 1.05, x: -3 }}
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-4 py-2 mb-6"
      >
        <div className=" px-4 py-2 flex bg-gray-200 rounded-lg hover:bg-gray-300 transition">
          <ArrowLeft className="w-5 h-5 " />
          Back
        </div>

        <a
          href="https://www.guestpostcrm.com/blog/guestpostcrm-uses-an-ai-avatar-for-every-reply/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            width="40"
            height="40"
            src="https://img.icons8.com/offices/30/info.png"
            alt="info"
          />
        </a>
      </motion.button>

      {/* GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
        {loading && [...Array(6)].map((_, i) => <AvatarSkeleton key={i} />)}

        {!loading &&
          avatars?.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl hover:shadow-2xl transition-all 
              overflow-hidden relative hover:border-blue-400/40"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* 3D EFFECT */}
              <motion.div
                whileHover={{ rotateY: 4, rotateX: -3 }}
                transition={{ type: "spring", stiffness: 120 }}
                className="relative"
              >
                {/* VIDEO */}
                <div className="relative mx-auto mt-3 w-60 h-60 p-4 group  overflow-hidden flex items-center justify-center rounded-full">
                  <video
                    src={`https://${item.avatar_url}`}
                    className="w-full h-full object-cover rounded-full"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                </div>

                {/* Preview Button */}
                <button
                  onClick={() => {
                    setModalOpen(true);
                    setModalUrl(item.avatar_url);
                  }}
                  className="absolute bottom-20 right-3 cursor-pointer bg-amber-500
                    text-black px-4 py-1 rounded-lg text-sm "
                >
                  Preview
                </button>

                {/* DETAILS */}
                <div className="p-5 space-y-3">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    {item.email?.split("@")[0] || "Unknown User"}
                  </h2>

                  <p className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-purple-600" />
                    {item.email}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ))}
      </div>

      {/* MODAL */}
      <VideoModal
        open={modalOpen}
        url={modalUrl}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

export default AvatarPage;

const VideoModal = ({ open, onClose, url }) => {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-3xl w-full"
        >
          <video
            src={`https://${url}`}
            className="w-full h-[500px] object-cover rounded-2xl"
            controls
            autoPlay
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/********************
 * SKELETON
 ********************/
const AvatarSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="rounded-2xl bg-white/40 backdrop-blur-lg border border-white/20 shadow-xl animate-pulse overflow-hidden"
  >
    <div className="w-full h-64 bg-gray-300 rounded-2xl" />
    <div className="p-5 space-y-4">
      <div className="h-4 bg-gray-300 rounded w-2/3" />
      <div className="h-3 bg-gray-300 rounded w-1/2" />
      <div className="h-3 bg-gray-300 rounded w-1/3" />
    </div>
  </motion.div>
);
