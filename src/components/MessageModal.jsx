import { motion } from "framer-motion";
import { X, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { useThreadContext } from "../hooks/useThreadContext";
import { fetchGpc } from "../services/api";
import { useMessage } from "../queries/threads.queries";

const MessageModal = ({
  showMessageModal,
  closeMessageModal,
  messageId,
  email,
  threadId,
  viewEmail,
  count,
  isModal = true,
}) => {
  const [messageContent, setMessageContent] = useState("");
  const { data, isPending: isMessageLoading, isError } = useMessage(messageId)

  const { handleMove } = useThreadContext();

  const [messageMeta, setMessageMeta] = useState({
    subject: "",
    from: "",
    date: "",
    fromEmail: "",
    time: "",
  });

  const cleanHtmlContent = (html) => {
    const cleaned = html
      .replace(/<style[^>]*>.*?<\/style>/gis, "")
      .replace(/<script[^>]*>.*?<\/script>/gis, "")
      .replace(/<!--.*?-->/g, "")
      .trim();

    return cleaned || html;
  };

  useEffect(() => {
    if ((isModal && !showMessageModal) || !messageId || isMessageLoading) return;
    console.log("MESSAGE", data)
    if (isError) {
      setMessageContent("No Content Available")
    }

    const htmlBody =
      data.email?.body_html ||
      data.email?.body ||
      data.email?.content ||
      "";

    const subject =
      data.email?.subject || "No Subject";

    const from = data.email?.from_name || "Unknown Sender";

    const fromEmail =
      data.email?.from_addr || "";

    const createdDate =
      data.email?.date_created || "";

    let formattedDate = "";
    let formattedTime = "";

    if (createdDate) {
      const d = new Date(createdDate);

      formattedDate =
        d.toLocaleDateString();

      formattedTime =
        d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
    }

    setMessageMeta({
      subject,
      from,
      fromEmail,
      date: formattedDate,
      time: formattedTime,
    });

    setMessageContent(
      htmlBody
        ? cleanHtmlContent(htmlBody)
        : "Thread Is Either Missing Or Deleted."
    );
  }, [showMessageModal, messageId, isModal, data, isError, isMessageLoading]);

  if (isModal && !showMessageModal)
    return null;

  const content = (
    <motion.div
      initial={{
        scale: 0.9,
        opacity: 0,
        y: 20,
      }}
      animate={{
        scale: 1,
        opacity: 1,
        y: 0,
      }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 300,
      }}
      onClick={(e) => e.stopPropagation()}
      className={`
        w-full min-w-0 flex flex-col overflow-hidden bg-white
        rounded-2xl sm:rounded-3xl
        ${isModal
          ? "max-w-7xl h-[92vh] sm:h-[85vh] shadow-2xl"
          : "h-full border border-gray-200 shadow-md"
        }
      `}
    >
      {/* HEADER
          The subject only becomes an absolutely-centred overlay from `xl` up,
          where the modal is finally wide enough to fit it between the sender
          block and the close button. Below that it is a normal wrapped row so
          it can truncate against a real width instead of bleeding out of the
          card on both sides. */}
      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            onClick={() =>
              handleMove({
                email,
                threadId,
                viewEmail,
              })
            }
            className="relative shrink-0 rounded-xl bg-white border border-gray-200 shadow-md hover:shadow-lg hover:-translate-y-1 active:scale-95 transition-all p-1"
          >
            <img
              src="https://img.icons8.com/keek/100/new-post.png"
              alt="new-post"
              className="w-8 h-8"
            />

            {count > 0 && (
              <span className="absolute -top-2 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </button>

          <div className="flex min-w-0 flex-col leading-tight">
            <h2
              title={messageMeta.from}
              className="truncate text-base font-semibold text-white sm:text-lg"
            >
              {messageMeta.from}
            </h2>

            <span
              title={messageMeta.fromEmail}
              className="truncate text-xs text-blue-100 sm:text-sm"
            >
              {messageMeta.fromEmail}
            </span>

            <span className="truncate text-[11px] text-blue-200 sm:text-xs">
              {messageMeta.date} •{" "}
              {messageMeta.time}
            </span>
          </div>
        </div>

        {isModal && (
          <button
            onClick={closeMessageModal}
            aria-label="Close message"
            className="shrink-0 self-start rounded-full p-2 transition hover:rotate-90 hover:bg-white/20 sm:self-center"
          >
            <X
              size={24}
              className="text-white"
            />
          </button>
        )}

        <div className="order-last w-full min-w-0 border-t border-white/20 pt-2 xl:absolute xl:left-1/2 xl:order-none xl:w-auto xl:max-w-xl xl:-translate-x-1/2 xl:border-0 xl:pt-0 xl:text-center">
          <h1
            title={messageMeta.subject}
            className="truncate text-sm font-semibold text-white xl:text-lg"
          >
            {messageMeta.subject}
          </h1>
        </div>
      </div>

      {/* BODY */}
      <div className="min-w-0 flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6 lg:p-8">
        {isMessageLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />

            <p className="text-gray-600 font-medium">
              Loading message content...
            </p>
          </div>
        ) : messageContent ? (
          /* overflow-x-auto rather than hidden: email HTML often contains
             fixed-width tables, which would otherwise be silently clipped. */
          <div className="w-full max-w-4xl min-w-0 mx-auto overflow-x-auto rounded-xl border border-white/50 bg-gradient-to-br from-[#fdfcfb] to-[#e2d1c3] shadow-inner p-3 sm:p-5">
            <div
              className="
          prose
          max-w-none
          break-words
          whitespace-pre-wrap
          [&_*]:max-w-full
          [&_*]:break-words
          [&_*]:wrap-anywhere
          [&_a]:break-all
          [&_img]:h-auto
          [&_table]:w-auto
        "
              dangerouslySetInnerHTML={{
                __html: messageContent,
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare
              size={32}
              className="text-gray-500"
            />

            <p className="text-gray-500 mt-2">
              This message doesn't contain
              readable content.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 backdrop-blur-md sm:p-4"
      onClick={closeMessageModal}
    >
      {content}
    </div>
  );
};

export default MessageModal;