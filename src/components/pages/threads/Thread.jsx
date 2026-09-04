import { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useThreadContext } from "../../../hooks/useThreadContext";
import { toast } from "react-toastify";
import { PageContext } from "../../../context/pageContext";
import { sendEmail, viewEmailAction } from "../../../store/Slices/viewEmail";
import { fetchGpc } from "../../../services/api";
import { generatePDF } from "../../../services/utils";
import { useNext } from "../../../hooks/useNext";

const Thread = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    context: {
      currentEmail: email,
      currentThread: threadId,
      handleSetCurrent
    },

  } = useThreadContext();

  const { state } = useLocation();

  const [pdfLoading, setPdfLoading] = useState(false);
  const { moveToNext } = useNext();
  const { superfastReply } = useContext(PageContext);

  const [htmlfile, setHtmlfile] = useState(state?.htmlFile);
  const [files, setFiles] = useState([]);
  const [editorContent, setEditorContent] = useState(
    state?.initialContent || ""
  );
  const [checkingThreadId, setCheckingTheadId] = useState(false);

  const { user } = useSelector((s) => s.user);
  const { error: sendError } = useSelector((s) => s.viewEmail);

  /**
   * If email + threadId are present in URL,
   * set them into ThreadContext and then remove
   * them from the URL.
   */
  useEffect(() => {
    const paramEmail = searchParams.get("email");
    const paramThreadId = searchParams.get("threadId");

    if (!paramEmail || !paramThreadId) {
      return;
    }

    handleSetCurrent({ email: paramEmail, thread: paramThreadId });

    // Remove email and threadId from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("email");
    newParams.delete("threadId");

    setSearchParams(newParams, { replace: true });
  }, [searchParams, handleSetCurrent, setSearchParams]);

  const handleSendClick = async (forceSend = 1) => {
    try {
      setCheckingTheadId(true);

      const data = await fetchGpc({
        params: {
          type: "re_check_thread",
          thread_id: threadId,
        },
      });

      console.log("MATHED THREAD ID", data);

      if (!(data?.success || data.data)) {
        toast.error("Failed to verify thread!");
        return;
      }

      if (
        !data?.data?.find(
          (ed) => ed.toLowerCase() == email.toLowerCase()
        )
      ) {
        toast.error("Wrong Thread Id Detected! Try Again.");
        return;
      }

      console.log("THREAD", threadId);

      const contentToSend = editorContent;

      const formData = new FormData();

      formData.append("threadId", threadId);
      formData.append("replyBody", contentToSend);
      formData.append("email", email);
      formData.append("current_email", user.email);
      formData.append("force_send", 1);

      files.forEach((file) => {
        formData.append("attachments[]", file.file);
      });

      dispatch(sendEmail(formData));

      state?.handleAfterSuccessMailSent?.();
      moveToNext(email);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while checking thread!");
    } finally {
      setCheckingTheadId(false);
    }
  };

  useEffect(() => {
    if (!threadId) {
      toast.error("Thread id is missing!");
      navigate(-1);
      return;
    }

    if (!email) {
      toast.error("Email id is missing!");
      navigate(-1);
    }
  }, [threadId, email, navigate]);

  useEffect(() => {
    if (sendError) {
      toast.error(sendError);
      dispatch(viewEmailAction.clearAllErrors());
    }
  }, [sendError, dispatch]);

  useEffect(() => {
    if (state?.initialContent) {
      setEditorContent(state.initialContent);
    }
  }, [state]);

  useEffect(() => {
    const processFiles = async () => {
      if (!htmlfile) return;

      try {
        setPdfLoading(true);

        const file = await generatePDF(htmlfile);

        setFiles([file]);
      } catch (err) {
        console.error("File conversion error:", err);
        toast.error("Failed to load attachments");
      } finally {
        setPdfLoading(false);
      }
    };

    processFiles();
  }, [htmlfile]);

  const value = {
    loadAiReply: state?.loadAiReply,
    superfastReply,
    files,
    setFiles,
    editorContent,
    setEditorContent,
    email,
    threadId,
    htmlfile,
    setHtmlfile,
    pdfLoading,
    handleSendClick,
    checkingThreadId,
    setCheckingTheadId,
  };

  return <Outlet context={value} />;
};

export default Thread;