import { useContext } from "react";
import { PageContext } from "../context/pageContext.jsx";

const DisplayIntro = () => {
  const { setDisplayIntro } = useContext(PageContext);

  const handleVideoEnd = () => {
    setDisplayIntro(false);
    localStorage.setItem("displayIntro", "false");
  };

  return (
    <div className="fixed inset-0 z-[9999] m-0 h-screen w-screen overflow-hidden  p-0">
      <video
        src="https://app.guestpostcrm.com/video.mp4"
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        className="h-full w-full object-cover"
      />
    </div>
  );
};

export default DisplayIntro;