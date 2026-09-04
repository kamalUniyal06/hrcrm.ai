import { Globe, Send, ChevronLeft } from "lucide-react";
import { TbMessageStar } from "react-icons/tb";
import { motion, AnimatePresence } from "framer-motion";
import { useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { viewEmailAction } from "../../../store/Slices/viewEmail";
import { useNavigate, useOutletContext } from "react-router-dom";
import useIdle from "../../../hooks/useIdle";
import TinyEditor from "../../TinyEditor";
import MessageModal from "../../MessageModal";
import { SendingOverlay } from "./SendingOverlay";
import ReplyButtons from "./ReplyButtons";
import RightThreadHeader from "./RightThreadHeader";
import { PageContext } from "../../../context/pageContext";
import LockedBar from "../../LockedBar";
const ThreadReply = () => {
  const editorRef = useRef(null);
  const [showBriefReason, setShowBriefReason] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const { showRefreshReminder, setShowRefreshReminder } = useContext(PageContext)
  const { user: currentUser } = useSelector(state => state.user)

  const {
    emails,
    editorContent,
    setEditorContent,
    handleSendClick,
    checkingThreadId,
    email,
    isLocked,
    recordUsers,
    threadId
  } = useOutletContext() || [];
  const [showMessageModal, setShowMessageModal] = useState(false);
  const lastMessage = emails?.[emails.length - 1];
  useIdle({ idle: false });
  const dispatch = useDispatch();
  const {
    message: sendMessage,
    sending,
    sendFailedResponse,
  } = useSelector((s) => s.viewEmail);
  const navigate = useNavigate();
  const [editorReady, setEditorReady] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (sendFailedResponse) {
      setShowFailedModal(true);
    }
  }, [sendFailedResponse]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        showFailedModal &&
        modalRef.current &&
        !modalRef.current.contains(e.target)
      ) {
        setShowFailedModal(false);
        dispatch(viewEmailAction.clearFailedResponse());
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showFailedModal]);
  return (
    <>
      <SendingOverlay sending={sending} email={email} />
      <MessageModal
        showMessageModal={showMessageModal}
        closeMessageModal={() => setShowMessageModal(false)}
        messageId={lastMessage?.message_id}
        email={email}
        threadId={threadId}
        viewEmail={emails}
        count={emails?.length || 0}
      />
      {/* {(aiLoading || templateLoading) && <PageLoader />} */}

      <motion.div
        animate={{
          top: showRefreshReminder ? 57 : 0,
          height: showRefreshReminder
            ? "calc(100vh - 57px)"
            : "100vh",
        }}
        transition={{
          duration: 0.35,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="
        fixed
        left-0
        right-0
        z-[999]
        bg-white
        flex
        flex-col
        overflow-hidden
    "
      >
        {/* HEADER
            flex-wrap is required, not cosmetic: RightThreadHeader is `w-full`
            below `sm`, so without wrapping it claims the whole row and crushes
            the title and buttons into each other. */}
        <div className="flex flex-wrap gap-x-2 gap-y-1 justify-between items-center px-2 py-1.5 sm:gap-3 sm:px-6 sm:py-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="shrink-0 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              {/* OPEN GMAIL */}
              <div
                className="flex min-w-0 items-center gap-2 cursor-pointer hover:opacity-90 transition sm:gap-3"
                onClick={() =>
                  window.open(
                    `https://mail.google.com/mail/u/0/#inbox/${threadId}`,
                    "_blank",
                  )
                }
              >
                <Send className="w-5 h-5 shrink-0" />
                <h2 className="min-w-0 truncate text-base sm:text-xl font-bold tracking-tight">
                  Compose Email
                </h2>
              </div>


              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMessageModal(true)}
                aria-label="View last message"
                className="flex shrink-0 items-center gap-2 cursor-pointer px-2 py-2 sm:px-3 rounded-full bg-white/20 hover:bg-white/30 transition shadow-sm"
              >
                <TbMessageStar className="w-5 h-5 text-yellow-400" />
              </motion.button>
            </div>
          </div>
          <RightThreadHeader />

        </div>
        {isLocked && (
          <LockedBar recordUsers={recordUsers} recordName="Thread" />
        )}
        {/* `min-h-0 flex-1` rather than `h-full`: this is a flex child of a
            100vh column that has already spent height on the header, so
            `h-full` overflows and pushes the action bar past the fold. */}
        <div className={`flex min-h-0 w-full flex-1 flex-col ${isLocked ? "pointer-events-none opacity-20" : ""
          }`}>
          <TinyEditor
            setEditorContent={setEditorContent}
            editorContent={editorContent}
            setEditorReady={setEditorReady}
            editorRef={editorRef}
          />

          {/* ✅ SUCCESS OVERLAY */}

          <div className="shrink-0 p-2 sm:p-6 border-t bg-gradient-to-r from-white to-gray-50 shadow-2xl">
            <ReplyButtons editorRef={editorRef} editorReady={editorReady} />
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {showFailedModal && sendFailedResponse && (
          <motion.div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
              transition={{ type: "spring", stiffness: 120 }}
              className="flex max-h-[92vh] w-full min-w-0 max-w-3xl flex-col overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
            >
              {/* HEADER */}
              <div className="flex shrink-0 justify-between items-center gap-3 mb-4">
                <h2 className="min-w-0 text-base sm:text-lg font-bold text-red-600">
                  ⚠️ Email Not Sent
                </h2>
                <button
                  aria-label="Close"
                  className="shrink-0"
                  onClick={() => {
                    setShowFailedModal(false);
                    dispatch(viewEmailAction.clearFailedResponse());
                  }}
                >
                  ✕
                </button>
              </div>
              {/* BRIEF REASON */}
              {/* BRIEF REASON BUTTON */}
              <div className="mb-4">
                {/* CONDITIONAL RENDER */}
                {showBriefReason && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-yellow-600">
                      Brief Reason:
                    </p>
                    <p className="text-sm text-gray-700">
                      {sendFailedResponse.brief_reason ||
                        "No brief reason available"}
                    </p>
                  </div>
                )}
              </div>
              {/* REASON */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-red-600">Reason:</p>
                <p className="text-sm text-gray-700">
                  {sendFailedResponse.reason}
                </p>
              </div>

              {/* SUGGESTED REPLY */}
              <div className="mb-5">
                <p className="text-sm font-semibold text-indigo-600">
                  Suggested Reply:
                </p>
                <div className="min-w-0 text-sm text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded-lg border max-h-60 overflow-auto">
                  <div
                    className="break-words [&_*]:max-w-full [&_a]:break-all"
                    dangerouslySetInnerHTML={{
                      __html: sendFailedResponse.suggested_reply,
                    }}
                  />
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
                {/* USE BRIEF REASON */}
                <button
                  onClick={() => setShowBriefReason(!showBriefReason)}
                  className="px-4 py-2 rounded-lg bg-yellow-500 text-white text-sm hover:bg-yellow-600"
                >
                  {showBriefReason ? "Hide Brief" : "Brief Reason"}
                </button>

                {/* USE SUGGESTED */}
                <button
                  onClick={() => {
                    setEditorContent(sendFailedResponse.suggested_reply);
                    dispatch(viewEmailAction.clearFailedResponse());
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                >
                  Use Suggested Reply
                </button>

                {/* FORCE SEND */}
                <button
                  onClick={() => {
                    handleSendClick(1);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
                >
                  Force Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ThreadReply;
