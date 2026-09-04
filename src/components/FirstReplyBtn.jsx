import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { viewEmailAction } from "../store/Slices/viewEmail";
import { fetchGpc } from "../services/api";
import { showConsole } from "../assets/assets";
import { LoadingChase } from "./Loading";
import { useNext } from "../hooks/useNext";
import { updateActivity } from "../services/utils";
import { useContact } from "../queries/contact.queries";
// import { threadId } from "node:worker_threads";

const FirstReplyBtn = ({ email, threadEmails = [] }) => {
  const dispatch = useDispatch();
  const { businessEmail } = useSelector((s) => s.user);
  const { data, isPending } = useContact(email);
  const threadId =  data?.contact?.thread_id

  const [showFirstReplyBtn, setShowFirstReplyBtn] = useState(false);
  const [reminderId, setReminderId] = useState(null);
  const { moveToNext } = useNext()
  const [frLoading, setFrLoading] = useState(false);
  const handleSendFirstReply = async () => {
    if (!reminderId) return;

    const alreadyFirstReplySent = threadEmails.some((mail) => {
      const fromEmail = mail?.from_email?.toLowerCase?.() || "";
      const userEmail = businessEmail?.toLowerCase?.() || "";

      return userEmail && (fromEmail === userEmail || fromEmail.includes(userEmail));
    });

    if (alreadyFirstReplySent) {
      const confirmSend = window.confirm(
        "First reply is already sent in this thread. Do you want to send it again?"
      );

      if (!confirmSend) return;
    }

    try {
      setFrLoading(true);
      await fetchGpc({
        params: { type: "send_reminder", reminder_id: reminderId , threadId: threadId},
      });
      toast.success(`First Reply Sent Successfully to ${email}`)
      updateActivity(email, "first reply sent");
      moveToNext(email)
      setShowFirstReplyBtn(false);
    } catch (err) {
      console.error("Error sending first reply:", err);
      toast.error("Failed to send first reply");
    } finally {
      setFrLoading(false);
    }
  };
  useEffect(() => {
    if (!email) return;

    const fetchFRButtonStatus = async () => {
      try {
        const data = await fetchGpc({ params: { type: "fr_button", email } });
        if (data?.reminder_id && data.reminder_id !== false) {
          setReminderId(data.reminder_id);
          setShowFirstReplyBtn(true);
        } else {
          setShowFirstReplyBtn(false);
          setReminderId(null);
        }
      } catch (err) {
        setShowFirstReplyBtn(false);
      }
    };

    fetchFRButtonStatus();
  }, [email]);
  return (
    showFirstReplyBtn && (
      <div
        className={` transition-opacity duration-200 ${showFirstReplyBtn ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      >
        <div className="relative group flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSendFirstReply();
            }}
            disabled={frLoading}
            className="
                flex items-center justify-center
                w-10 h-10
                bg-white rounded-xl shadow-md border border-gray-200
                hover:shadow-lg active:scale-95 hover:-translate-y-1
                transition-all
              "
          >
            <div className="w-6 h-6 flex items-center justify-center">
              {frLoading ? (
                <LoadingChase size="20" />
              ) : (
                <img
                  src="https://img.icons8.com/color/48/reply.png"
                  className="w-6 h-6"
                  alt="first-reply"
                />
              )}
            </div>
          </button>

          {/* TOOLTIP (layout-safe) */}
          <span
            className="
                pointer-events-none
                absolute top-full mt-2 left-1/2 -translate-x-1/2
                bg-black text-white text-xs px-2 py-1 rounded
                opacity-0 scale-95
                group-hover:opacity-100 group-hover:scale-100
                transition-all duration-200
                whitespace-nowrap shadow-lg z-50
              "
          >
            Send First Reply
          </span>
        </div>
      </div>
    )
  );
};

export default FirstReplyBtn;
