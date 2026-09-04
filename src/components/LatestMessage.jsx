import React, { useContext, useEffect, useState } from "react";
import { useThreadContext } from "../hooks/useThreadContext";
import { useNavigate } from "react-router-dom";
import { getDomain, getSafeHTML, showConsole } from "../assets/assets";
import { BiSolidMessageCheck } from "react-icons/bi";
import { useDispatch, useSelector } from "react-redux";
import { LoadingChase } from "./Loading";
import {
  HandCoins,
  Mail,
  Pencil,
  Play,
  SparkleIcon,
  ThumbsDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { BsRobot } from "react-icons/bs";
import { toast } from "react-toastify";
import EmojiInput from "./EmojiPicker";
import FirstReplyBtn from "./FirstReplyBtn";
import { useNext } from "../hooks/useNext";
import PromptLadger from "./PromptLadger";
import { useMailerSummary } from "../queries/mailerSummary.queries";
import { useTimeline } from "../context/TimelineContext";
import { useThread } from "../queries/threads.queries";
import { useTemplateByName } from "../queries/template.queries";
import { useQuickBtn } from "../queries/quickBtn.queries";
import { useContact, useUpdateContact } from "../queries/contact.queries";
import { queryClient } from "../lib/queryClient";
import { emailKeys } from "../queries/email.queries";
const LatestMessage = ({ handleMessageClick }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { handleMove } = useThreadContext();
  const [activePromptId, setActivePromptId] = useState(null)
  const { moveToNext } = useNext()
  const { currentEmail } = useTimeline()
  const { mutate: updateContact, isPending: contactUpdateLoading, error: contactError } = useUpdateContact()

  const { data: summary, isPending: mail } = useMailerSummary(currentEmail);
  const { data: contactData, isPending: contactLoading } = useContact(currentEmail);
  const contactInfo = contactData?.contact
  const accountInfo = contactData?.account
  const mailersSummary = summary?.mailers_summary
  const { data: buttons, isError: buttonsError, isLoading: buttonsLoading } = useQuickBtn();
  const { sending } = useSelector((state) => state.viewEmail);
  const { data, isPending } = useThread(currentEmail)
  const viewEmail = data?.emails
  const email1 = contactInfo?.email1;
  const threadId = contactInfo?.thread_id;
  const hanldeConvDone = () => {
    updateContact({ id: contactInfo?.id, payload: { ...contactInfo, conversation_complete: "1" } })
    toast.success(`Conversion Complete with ${email1}`)
    moveToNext(email1)
  };

  const { data: askBudgetTemp } = useTemplateByName("Ask Budget");
  const { data: sorryTemp } = useTemplateByName("Sorry");

  useEffect(() => {
    if (buttonsError) {
      toast.error("Failed To Load Quick Actin Buttons.");
    }
  }, [buttonsError]);

  return (
    <>
      <div className="custom-scrollbar flex flex-col justify-between overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-xl sm:p-4">
        <PromptLadger activePromptId={activePromptId} setActivePromptId={setActivePromptId} />
        <div className="flex flex-col gap-2 justify-center mb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h3 className="text-black-700 font-medium text-lg">Latest Message</h3>
              <button
                onClick={() =>
                  handleMove({ email: email1, threadId })
                }
                className="relative rounded-xl   shadow-md
               hover:shadow-lg hover:-translate-y-1 active:scale-95
               transition-all flex items-center justify-center cursor-pointer"
              >
                <img
                  width="44"
                  height="44"
                  src="https://img.icons8.com/keek/100/filled-message.png"
                  alt="filled-message"
                />{" "}
                {viewEmail?.length > 0 && (
                  <span className="absolute -top-2 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {viewEmail?.length}
                  </span>
                )}
              </button>
            </div>

            {email1 && viewEmail?.length > 0 && (
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
      ${viewEmail[viewEmail.length - 1].from_email === email1
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                  }
    `}
              >
                <Mail className="w-4 h-4" />

                {viewEmail[viewEmail.length - 1].from_email === email1
                  ? "Client Mail"
                  : "Our Mail"}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {viewEmail?.length > 0 && (
              <>
                <span className="text-xs text-gray-500">
                  {viewEmail[viewEmail.length - 1]?.date_created} <br />
                </span>
                <span className="text-xs text-gray-500">
                  ( {viewEmail[viewEmail.length - 1]?.date_created_ago} )<br />
                </span>
              </>
            )}
          </div>
        </div>
        <div className="text-gray-700 font-medium bg-slate-200 p-2 rounded-lg text-sm">
          <div
            className=" leading-relaxed whitespace-pre-line transition-all duration-300 h-24 overflow-hidden"
            dangerouslySetInnerHTML={{
              __html:
                viewEmail?.length > 0
                  ? getSafeHTML(
                    viewEmail[viewEmail.length - 1]?.body_html ||
                    viewEmail[viewEmail.length - 1]?.body ||
                    "",
                  )
                  : data?.message ?? "No Message Found",
            }}
          />
          {/* View Message Button */}
          {viewEmail?.length > 0 &&
            viewEmail[viewEmail.length - 1].message_id && (
              <button
                onClick={() =>
                  handleMessageClick(
                    viewEmail[viewEmail.length - 1]?.message_id,
                  )
                }
                className="text-blue-600 hover:text-blue-700 transition-opacity flex  cursor-pointer  "
              >
                view more...
              </button>
            )}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl px-1 py-4 sm:p-4">
          <div className="flex min-w-0 flex-1 flex-wrap gap-3 sm:gap-4">
            <QuickBtn
              icon={<BsRobot size={24} />}
              onClick={() =>
                handleMove({
                  email: email1,
                  threadId,
                  reply: mailersSummary?.ai_response,
                  addActivity: true,
                })
              }
              editIcon={<SparkleIcon size={16} />}
              disabled={sending || !mailersSummary?.ai_response}
              tooltip="AI Reply"
              onEditClick={() => {
                setActivePromptId(mailersSummary.prompt_id)
              }}
            />
            <QuickBtn
              icon={<Play size={24} />}
              onClick={() => alert("Feature Coming Soon.")}
              editIcon={<SparkleIcon size={16} />}
              disabled={sending || !mailersSummary?.ai_response}
              tooltip="AI Summary"
              onEditClick={() => {
                setActivePromptId(mailersSummary.prompt_id)
              }}
            />
            {buttonsLoading ? (
              <LoadingChase size="30" color="cyan" />
            ) : (
              buttons?.map((btn, i) => (
                <QuickBtn
                  key={i}
                  icon={
                    btn.name == "Ask Budget" ? <HandCoins /> : <ThumbsDown />
                  }
                  onClick={() =>
                    handleMove({
                      email: email1,
                      threadId,
                      reply:
                        btn.name == "Ask Budget"
                          ? askBudgetTemp[0]?.body_html
                          : sorryTemp[0]?.body_html,
                    })
                  }
                  tooltip={`${btn.body}`}
                  editIcon={<Pencil size={18} />}
                  onEditClick={() =>
                    navigate("/settings/templates", {
                      state: {
                        templateId:
                          btn.name == "Ask Budget"
                            ? askBudgetTemp[0]?.id
                            : sorryTemp[0]?.id,
                      },
                    })
                  }
                  disabled={sending}
                />
              ))
            )}
            <FirstReplyBtn email={contactInfo?.email1} threadEmails={viewEmail} />
            <EmojiInput />
          </div>
          {contactInfo?.conversation_complete == "0" && (
            <div className="flex flex-col items-center gap-2 relative group">
              {/* Tooltip */}
              <div className="absolute -bottom-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-3 py-1 rounded-md ">
                Done Conversation
              </div>

              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="flex items-center justify-center bg-slate-600 hover:bg-green-700 cursor-pointer text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={hanldeConvDone}
              >
                <BiSolidMessageCheck className="w-6 h-6" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LatestMessage;

function QuickBtn({
  icon,
  onClick,
  editIcon,
  onEditClick,
  tooltip,
  disabled = false,
}) {
  return (
    <div className="flex flex-col items-center gap-2 relative group">
      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400 }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        disabled={disabled}
        className="flex items-center justify-center w-9 h-9
        bg-primary text-white rounded-xl shadow-md border border-gray-200 cursor-pointer
        hover:shadow-lg active:scale-95 hover:-translate-y-1
        transition-all"
      >
        {icon}
      </motion.button>

      {/* EDIT */}
      {editIcon && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditClick?.();
          }}
          className="text-blue-500 hover:text-blue-600 cursor-pointer"
        >
          {editIcon}
        </button>
      )}

      {/* TOOLTIP */}
      {tooltip && (
        <div
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2
          bg-sky-600 text-white text-xs px-2 py-1 rounded
          opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100
          transition-all whitespace-nowrap shadow-lg z-50"
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
