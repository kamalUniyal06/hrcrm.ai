import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { motion } from "framer-motion";

const MicInput = ({ editorRef }) => {
  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const lastResultIndex = useRef(0);

  const [listening, setListening] = useState(false);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN"; // Hindi + English
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = "";

      for (let i = lastResultIndex.current; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + " ";
          lastResultIndex.current = i + 1;
        }
      }

      if (finalText && editorRef?.current) {
        editorRef.current.focus();
        editorRef.current.insertContent(finalText);
      }
    };

    recognition.onend = () => {
      // Restart only if still listening AND page visible
      if (listeningRef.current && document.visibilityState === "visible") {
        try {
          recognition.start();
        } catch (e) {
          console.warn("Restart prevented:", e);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);

      if (event.error === "not-allowed") {
        listeningRef.current = false;
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    // 🔥 Stop mic when user switches tab
    const handleVisibilityChange = () => {
      if (document.hidden && recognitionRef.current) {
        listeningRef.current = false;
        setListening(false);

        try {
          recognitionRef.current.stop();
        } catch { }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 🔥 Cleanup when component unmounts
    return () => {
      listeningRef.current = false;
      lastResultIndex.current = 0;

      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.stop();
        } catch { }
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [editorRef]);

  const toggleMic = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listeningRef.current) {
      // 🔴 Stop
      listeningRef.current = false;
      setListening(false);
      lastResultIndex.current = 0;

      try {
        recognition.stop();
      } catch { }
    } else {
      // 🟢 Start
      listeningRef.current = true;
      setListening(true);
      lastResultIndex.current = 0;

      try {
        recognition.start();
      } catch (err) {
        console.warn("Mic already started");
      }
    }
  };

  return (
    <motion.button
      onClick={toggleMic}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative w-10 h-10 rounded-full shadow-lg flex items-center justify-center overflow-hidden ${listening ? "bg-gradient-to-r from-red-500 to-pink-600" : "bg-blue-600"
        }`}
    >
      {!listening ? (
        <Mic size={24} className="text-white" />
      ) : (
        <div className="flex items-center justify-center gap-[3px]">
          {[8, 14, 22, 32, 40, 32, 22, 14, 8].map((baseHeight, i) => (
            <motion.div
              key={i}
              className="w-[3px] bg-white rounded-full"
              animate={{
                height: [
                  baseHeight * 0.6,
                  baseHeight,
                  baseHeight * 0.7,
                  baseHeight * 1.1,
                  baseHeight * 0.6,
                ],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.08,
                ease: "easeInOut",
              }}
              style={{
                height: baseHeight,
              }}
            />
          ))}
        </div>
      )}
    </motion.button>
  );
};

export default MicInput;
