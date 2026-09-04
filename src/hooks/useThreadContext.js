import { useContext } from "react";
import { ThreadContext } from "../context/ThreadContext";
import { useNavigate } from "react-router-dom";

export const useThreadContext = () => {
  const navigateTo = useNavigate();
  const context = useContext(ThreadContext);
  const moveToThread = () => {
    navigateTo(`/thread/view`);
  };
  const moveToReply = (initialContent, htmlFile, handleAfterSuccessMailSent) => {
    navigateTo(`/thread/reply`, {
      state: { initialContent, htmlFile, handleAfterSuccessMailSent },
    });
  };
  if (!context) {
    throw new Error(
      "useThreadContext must be used inside ThreadContextProvider",
    );
  }
  const handleMove = ({
    email,
    threadId,
    reply = false,
    addActivity = false,
    htmlFile = null,
    handleAfterSuccessMailSent = null,
  }) => {
    context.handleSetCurrent({ email, thread: threadId });
    reply !== false
      ? moveToReply(reply, htmlFile, handleAfterSuccessMailSent)
      : moveToThread();
    (addActivity || !reply) && localStorage.setItem("addActivity", true);
  };
  return { context, handleMove };
};
