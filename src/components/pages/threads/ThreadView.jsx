import {
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  MessagesSquare,
  PenLine,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useNavigate, useOutletContext } from "react-router-dom";

import useIdle from "../../../hooks/useIdle";
import { ThreadSkeleton } from "./ThreadSkeleton.jsx";
import { SmallTinyEditor } from "../../TinyEditor.jsx";

import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
} from "react-resizable-panels";

import { SendingOverlay } from "./SendingOverlay.jsx";
import ReplyButtons from "./ReplyButtons.jsx";
import Inbox from "./Inbox.jsx";
import { fetchGpc } from "../../../services/api.js";
import RightThreadHeader from "./RightThreadHeader.jsx";
import {
  useMailerSummary,
  useRegenMailerSummary,
} from "../../../queries/mailerSummary.queries.js";
import { useThread } from "../../../queries/threads.queries.js";
import { PageContext } from "../../../context/pageContext.jsx";
import LockedBar from "../../LockedBar.jsx";
import { useMediaQuery } from "../../../hooks/useMediaQuery.js";

export default function ThreadView() {
  const scrollRef = useRef();
  const { showRefreshReminder, setShowRefreshReminder } = useContext(PageContext)
  const {
    loadAiReply = true,
    superfastReply,
    editorContent,
    setEditorContent,
    checkingThreadId,
    email,
    threadId,
    recordUsers,
    isLocked,
  } = useOutletContext() || [];
  const { user: currentUser } = useSelector(state => state.user)

  const { data: emailsData, isPending: loading } = useThread(email, threadId);
  const emails = emailsData?.emails;
  const leftPanelRef = useRef(null);

  const [showReplyPanel, setShowReplyPanel] = useState(
    loadAiReply || superfastReply
  );
  const [showSummary, setShowSummary] = useState(false);

  /* ------------------------------------------------------------------
   * Responsive mode
   * ------------------------------------------------------------------
   * The side-by-side composer/conversation split needs real width — at
   * 375px each panel would get ~180px. Below `lg` we drop the resizable
   * PanelGroup and expose the two panes as tabs instead, so each one gets
   * the full width and nothing has to be removed to make room.
   */
  const isWideLayout = useMediaQuery("(min-width: 1024px)");

  const [mobileTab, setMobileTab] = useState(
    loadAiReply || superfastReply ? "reply" : "conversation"
  );
  const firstMessageRef = useRef(null);
  const lastMessageRef = useRef(null);

  const { data, isPending: summaryLoading } = useMailerSummary({ email, threadId });
  const regenSummary = useRegenMailerSummary();
  const mailersSummary = data?.mailers_summary;

  const hasMutatedRef = useRef({});
  const lastLoadedRef = useRef({ email: "", aiResponse: "" });

  useIdle({ idle: false });

  const navigate = useNavigate();

  const { sending } = useSelector((s) => s.viewEmail);

  const [messageLimit, setMessageLimit] = useState(3);
  const [openMessageId, setOpenMessageId] = useState(null);
  const [fullMessage, setFullMessage] = useState(null);

  const visibleMessages = emails?.slice(-messageLimit);

  const [editorReady, setEditorReady] = useState(false);
  const editorRef = useRef(null);

  const [focusedIndex, setFocusedIndex] = useState(
    visibleMessages?.length ? visibleMessages.length - 1 : 0
  );



  // Clear editor content when email changes to prevent showing old thread's content
  useEffect(() => {
    if (email) {
      setEditorContent("");
    }
  }, [email, setEditorContent]);

  useEffect(() => {
    if (!email) return;

    if (summaryLoading || regenSummary.isPending) return;

    const aiResponse = mailersSummary?.ai_response;

    if (!aiResponse) {
      if (!hasMutatedRef.current[email]) {
        hasMutatedRef.current[email] = true;
        regenSummary.mutate(email);
      }
      return;
    }

    if (
      lastLoadedRef.current.email !== email ||
      lastLoadedRef.current.aiResponse !== aiResponse
    ) {
      setEditorContent(aiResponse);
      lastLoadedRef.current = { email, aiResponse };
    }
  }, [
    email,
    mailersSummary,
    summaryLoading,
    regenSummary.isPending,
    setEditorContent,
  ]);

  const fetchFullMessage = async (messageId) => {
    try {
      setFullMessage(null);

      const data = await fetchGpc({
        params: {
          type: "view_msg",
          message_id: messageId,
          full: 1,
        },
      });

      if (data?.success) {
        setFullMessage(data.email);
      } else {
        toast.error("Failed to load full message");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed To Fetch Full Message!");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!visibleMessages || visibleMessages.length === 0) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();

        setFocusedIndex((prev) => {
          const newIndex = Math.max(prev - 1, 0);

          scrollRef.current?.children?.[newIndex]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          return newIndex;
        });
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();

        setFocusedIndex((prev) => {
          const newIndex = Math.min(prev + 1, visibleMessages.length - 1);

          scrollRef.current?.children?.[newIndex]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          return newIndex;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visibleMessages]);

  /* The editor only exists while its pane is mounted. Clear `editorReady` when
     it is not, so nothing acts on a stale editorRef pointing at a destroyed
     TinyMCE instance (applies to toggling the reply panel on wide screens too). */
  const editorMounted = isWideLayout ? showReplyPanel : mobileTab === "reply";

  useEffect(() => {
    if (!editorMounted) setEditorReady(false);
  }, [editorMounted]);

  /* Jump to the newest message. Also re-runs when the conversation tab is
     re-selected on mobile, since that pane is unmounted while hidden. */
  useEffect(() => {
    if (!scrollRef.current) return;
    if (!isWideLayout && mobileTab !== "conversation") return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [emails?.length, isWideLayout, mobileTab]);

  /* ------------------------------------------------------------------
   * Panes — defined once and composed into either layout, so the mobile
   * view runs the exact same components (and therefore the exact same
   * functionality) as the desktop split.
   * ---------------------------------------------------------------- */

  const aiSummaryPane = (
    <div className="flex-shrink-0 border-b border-gray-200 bg-white p-2 sm:p-3">
      <div className="overflow-hidden rounded-lg bg-slate-100">
        <button
          type="button"
          onClick={() => setShowSummary((prev) => !prev)}
          aria-expanded={showSummary}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-slate-200 sm:px-4 sm:py-3"
        >
          <h2 className="text-sm font-medium tracking-wide text-purple-600">
            ✦ AI Summary
          </h2>

          <ChevronRight
            className={`h-4 w-4 shrink-0 text-slate-600 transition-transform duration-200 ${showSummary ? "rotate-90" : ""
              }`}
          />
        </button>

        {showSummary && (
          <div className="border-t border-slate-200 px-3 py-3 sm:px-4">
            <div className="max-h-[180px] overflow-y-auto">
              {summaryLoading || regenSummary.isPending ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 w-full rounded bg-slate-200" />
                  <div className="h-3 w-[92%] rounded bg-slate-200" />
                  <div className="h-3 w-[80%] rounded bg-slate-200" />
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                  {mailersSummary?.summary || "No summary available"}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const editorPane = (
    <>
      {(summaryLoading || regenSummary.isPending) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent"></div>
            <p className="text-xs font-medium text-gray-600">
              Loading content...
            </p>
          </div>
        </div>
      )}

      <SmallTinyEditor
        setEditorContent={setEditorContent}
        editorContent={editorContent}
        setEditorReady={setEditorReady}
        editorRef={editorRef}
      />
    </>
  );

  const replyToolbarPane = (
    <ReplyButtons
      editorReady={editorReady}
      editorRef={editorRef}
      threadEmails={emails}
    />
  );

  const conversationPane = (
    <>
      <Inbox
        scrollRef={scrollRef}
        visibleMessages={visibleMessages}
        emails={emails}
        firstMessageRef={firstMessageRef}
        lastMessageRef={lastMessageRef}
        setOpenMessageId={setOpenMessageId}
        fetchFullMessage={fetchFullMessage}
        messageLimit={messageLimit}
        setMessageLimit={setMessageLimit}
        showReplyPanel={showReplyPanel}
        setShowReplyPanel={setShowReplyPanel}
        showReplyToggle={isWideLayout}
      />

      {!(loadAiReply || superfastReply) && (
        <div className="flex flex-shrink-0 justify-center border-t border-gray-100 bg-white p-3 sm:p-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/thread/reply`)}
            className="flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 py-3 font-semibold text-white shadow-lg transition hover:shadow-xl"
          >
            <Send className="h-5 w-5" />
            <span>Reply</span>
          </motion.button>
        </div>
      )}
    </>
  );

  return (
    <>
      <SendingOverlay sending={sending || checkingThreadId} email={email} />

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
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-2 py-1.5 text-white shadow-lg sm:px-6 sm:py-1">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              aria-label="Back to timeline"
              className="shrink-0 cursor-pointer rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>

            <div className="group flex min-w-0 flex-1 items-center gap-3">
              <div
                className="flex min-w-0 cursor-pointer items-center gap-3 transition"
                onClick={() =>
                  window.open(
                    `https://mail.google.com/mail/u/0/#inbox/${threadId}`,
                    "_blank"
                  )
                }
              >
                <h2
                  title={emails?.[emails?.length - 1]?.subject}
                  className="
                    min-w-0 truncate text-sm font-semibold tracking-tight sm:text-md
                    transition-all duration-300 hover:text-blue-200 hover:underline
                    lg:max-w-[400px]
                  "
                >
                  {emails?.[emails?.length - 1]?.subject}
                </h2>
              </div>
            </div>
          </div>

          <RightThreadHeader />
        </div>
        {isLocked && (
          <LockedBar recordUsers={recordUsers} recordName="Thread" />
        )}
        {loading ? (
          <ThreadSkeleton />
        ) : !isWideLayout ? (
          /* ══════════════ NARROW LAYOUT — tabbed panes ══════════════ */
          <div className="flex min-h-0 flex-1 flex-col">
            <div
              role="tablist"
              aria-label="Thread panes"
              className="flex shrink-0 border-b border-gray-200 bg-white"
            >
              {[
                {
                  key: "conversation",
                  label: "Conversation",
                  icon: MessagesSquare,
                  count: emails?.length,
                },
                {
                  key: "reply",
                  label: "Reply",
                  icon: PenLine,
                },
              ].map((tab) => {
                const active = mobileTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMobileTab(tab.key)}
                    className={`relative flex flex-1 items-center justify-center gap-2 px-2 py-2.5 text-sm font-semibold transition ${active
                      ? "text-indigo-600"
                      : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    <tab.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>

                    {tab.count > 0 && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[11px] font-bold text-slate-600">
                        {tab.count}
                      </span>
                    )}

                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {mobileTab === "conversation" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
                {conversationPane}
              </div>
            ) : (
              <div
                className={`flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50 ${isLocked ? "pointer-events-none opacity-20" : ""
                  }`}
              >
                {aiSummaryPane}

                <div className="relative min-h-[220px] flex-1 bg-white">
                  {editorPane}
                </div>

                <div className="flex-shrink-0 border-t border-gray-200 bg-slate-50 p-2">
                  {replyToolbarPane}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ══════════════ WIDE LAYOUT — resizable split ══════════════ */
          <PanelGroup direction="horizontal" className="flex-1">
            {/* LEFT PANEL */}
            {showReplyPanel && (
              <>
                <Panel
                  ref={leftPanelRef}
                  minSize={10}
                  maxSize={90}
                  className={`flex h-full flex-col overflow-hidden border-r border-gray-200 bg-slate-50 ${isLocked ? "pointer-events-none opacity-20" : ""
                    }`}
                >
                  {/* AI Summary */}
                  {aiSummaryPane}

                  {/* Editor */}
                  <div className="relative min-h-0 flex-1 bg-white">
                    {editorPane}
                  </div>

                  {/* Reply Buttons */}
                  <div className="flex-shrink-0 border-t border-gray-200 bg-slate-50 p-3">
                    {replyToolbarPane}
                  </div>
                </Panel>

                {/* divider wrapper */}
                <div className="relative flex w-4 shrink-0 items-stretch justify-center">
                  {/* actual draggable resize handle */}
                  <PanelResizeHandle className="absolute inset-0 z-10 cursor-col-resize">
                    <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-gray-200 transition-colors hover:bg-indigo-500" />
                  </PanelResizeHandle>

                  {/* clickable buttons layer */}
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <div className="pointer-events-auto flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (leftPanelRef.current) {
                            const current =
                              leftPanelRef.current.getSize?.() ||
                              40;

                            leftPanelRef.current.resize(
                              Math.min(current + 25, 100)
                            );
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50"
                        title="Shrink left panel"
                      >
                        <ChevronRight className="h-4 w-4 text-gray-600" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (leftPanelRef.current) {
                            const current =
                              leftPanelRef.current.getSize?.() ||
                              40;

                            leftPanelRef.current.resize(
                              Math.max(current - 25, 10)
                            );
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50"
                        title="Expand left panel"
                      >
                        <ChevronLeft className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* RIGHT PANEL */}
            <Panel className="flex h-full flex-col overflow-hidden bg-white">
              {conversationPane}
            </Panel>
          </PanelGroup>
        )}

        {/* FULL MESSAGE MODAL */}
        <AnimatePresence>
          {openMessageId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-2 sm:p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                /* Definite height (not just max-h) so the flex-1 iframe below
                   has something to resolve its height against. */
                className="flex h-[92vh] w-full min-w-0 max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[85vh]"
              >
                {/* HEADER */}
                <div className="flex shrink-0 items-start justify-between gap-2 border-b px-4 py-3 sm:items-center sm:px-6 sm:py-4">
                  <div className="min-w-0">
                    <h3
                      title={fullMessage?.subject || "Email"}
                      className="truncate text-base font-semibold sm:text-lg"
                    >
                      {fullMessage?.subject || "Email"}
                    </h3>

                    <p className="truncate text-xs text-gray-500">
                      {fullMessage?.from_name} &lt;{fullMessage?.from_email}
                      &gt;
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setOpenMessageId(null);
                      setFullMessage(null);
                    }}
                    aria-label="Close message preview"
                    className="shrink-0 rounded-full p-2 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* BODY — was a hard 700x700 box, which overflowed the card
                    on any screen narrower than that. */}
                <iframe
                  title="Email Preview"
                  className="min-h-0 w-full flex-1 border-0"
                  sandbox=""
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <style>
                          body {
                            margin: 0;
                            padding: 16px;
                            background: #ffffff;
                          }
                        </style>
                      </head>
                      <body>
                        ${fullMessage?.body_html || fullMessage?.body || ""}
                      </body>
                    </html>
                  `}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}