import { useNavigate, useOutletContext } from "react-router-dom";
import TemplateSelectorModal from "../../TemplateSelectorModal";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { base64ToUtf8 } from "../../../assets/assets";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  CreditCard,
  Edit,
  Edit2,
  LayoutTemplateIcon,
  PenLine,
  Send,
  Sparkles,
  StopCircle,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import Attachment from "../../Attachment";
import MicInput from "../../MicInput";
import { LoadingChase } from "../../Loading";
import { aiReplyAction, getAiReply } from "../../../store/Slices/aiReply";
import FirstReplyBtn from "../../FirstReplyBtn";
import { DeepReplyBtn } from "../../DeepReplyBtn";
import { SmallTinyEditor } from "../../TinyEditor";
import IconButton from "../../ui/Buttons/IconButton";
import { BiSolidMessageCheck } from "react-icons/bi";
import { fetchGpc } from "../../../services/api";
import { useNext } from "../../../hooks/useNext";
import {
  useDefaultTemplate,
  useTemplate,
  useTemplateByEmail,
  useTemplateByName,
} from "../../../queries/template.queries";
import { useContact, useUpdateContact } from "../../../queries/contact.queries";
import { applyHashtag, updateActivity } from "../../../services/utils";
import { queryClient } from "../../../lib/queryClient";
import { movedEmailsKeys } from "../../../queries/movedEmail.queries";
import { emailKeys } from "../../../queries/email.queries";

const TOOLBAR_BTN =
  "inline-flex items-center gap-2 h-9 px-4 rounded-xl border text-[13px] font-medium whitespace-nowrap transition-all duration-200";
const TOOLBAR_BTN_DEFAULT =
  "bg-[#F6F7FB] border-[#E7EAF3] text-[#2A2F3A] hover:bg-[#EEF1F7]";
const TOOLBAR_BTN_ACTIVE =
  "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100";
const TOOLBAR_BTN_WARNING =
  "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100";
const TOOLBAR_BTN_DANGER =
  "bg-red-50 border-red-200 text-red-600 hover:bg-red-100";

const ICON_BTN =
  "flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-all duration-200 hover:bg-gray-100";

const ReplyButtons = ({ editorRef, editorReady, threadEmails = [] }) => {
  const {
    setEditorContent,
    setFiles,
    files,
    editorContent,
    htmlfile,
    setHtmlfile,
    pdfLoading,
    email,
    threadId,
    handleSendClick,
    checkingThreadId
  } = useOutletContext();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { moveToNext } = useNext();
  const { sending } = useSelector((s) => s.viewEmail);

  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const [aiReplyContent, setAiReplyContent] = useState("");
  const [openParent, setOpenParent] = useState(null);
  const [favourites, setFavourites] = useState([]);
  const [templateId, setTemplateId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const { mutate: updateContact } = useUpdateContact()
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [tempHtml, setTempHtml] = useState(htmlfile || "");
  const [editorReadyLocal, setEditorReadyLocal] = useState(false);

  /* Below `lg` the template/AI toolbar folds behind a disclosure. It holds a
     dozen buttons which would otherwise wrap into 4-5 rows and squeeze the
     editor off screen. Nothing is removed — it is all one tap away, and the
     send/attach/mic row below stays visible at all times.
     Note this is a wrapped grid rather than a sideways scroller on purpose:
     the dynamic template buttons open absolute dropdowns, which an
     overflow-x container would clip. */
  const [showTools, setShowTools] = useState(false);

  const editorRefLocal = useRef(null);

  const {
    aiReply: aiResponse,
    error: aiError,
    message,
  } = useSelector((s) => s.aiReply);

  const { crmEndpoint } = useSelector((s) => s.user);

  /* ── data hooks ─────────────────────────────────────────── */
  const { isPending: loading, data: buttons } = useTemplateByEmail(email);
  const { isPending: contactLoading, data: contact } = useContact(email);
  const { data: template } = useTemplate(templateId);
  const { data: defaultTemplate } = useDefaultTemplate(email);

  /* ── effects ─────────────────────────────────────────────── */
  useEffect(() => {
    if (template && editorReady && editorRef.current) {
      const html =
        template?.[0]?.body_html || base64ToUtf8(defaultTemplate?.html_base64);
      if (html) setEditorContent(html);
      else toast.warn("Template is empty—starting with blank editor.");
    }
  }, [template, editorReady]);

  useEffect(() => {
    if (message && aiResponse) {
      insertAiReply(aiResponse);
      dispatch(aiReplyAction.clearMessge());
    }
    if (aiError) {
      toast.error(aiError);
      dispatch(aiReplyAction.clearAllErrors());
    }
  }, [message, aiResponse, dispatch]);



  const handleConvDone = () => {
    updateContact({ id: contact.contact?.id, payload: { ...contact?.contact, conversation_complete: "1" } })

    toast.success(`Conversion Complete with ${email}`);
    moveToNext(email);
  };

  const insertAiReply = (input) => {
    setOpenParent(null);
    setTemplateId(null);
    setEditorContent(input);
  };

  const handleToggleStopEmails = async () => {
    setStopLoading(true);
    try {
      const newValue = contact?.contact?.is_stop === "1" ? "0" : "1";

      await fetchGpc({
        params: {
          type: "force_stop",
          id: contact?.contact?.id,
          new_value: newValue,
          user: email,
        },
      });
      updateActivity(email, Number(newValue) ? "Email Stopped  " : "Email Resumed ")
      applyHashtag({ email, memo_no: 7, method: newValue === "1" ? "GET" : "DELETE" });
      queryClient.invalidateQueries({ queryKey: movedEmailsKeys.all })
      toast.success(newValue === "1" ? "Emails stopped successfully" : "Emails resumed successfully");
      moveToNext(email);
    } catch (err) {
      console.error(err);
      toast.error("Failed To Change Email State!");
    } finally {
      setStopLoading(false);
    }
  };

  const ActionBtn = ({
    onClick,
    onEdit,
    icon: Icon,
    label,
    active = false,
    variant = "default",
    className = "",
  }) => {
    const variantClass =
      variant === "danger"
        ? TOOLBAR_BTN_DANGER
        : variant === "warning"
          ? TOOLBAR_BTN_WARNING
          : active
            ? TOOLBAR_BTN_ACTIVE
            : TOOLBAR_BTN_DEFAULT;

    return (
      <div className="relative inline-flex">
        <motion.button
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -1 }}
          onClick={onClick}
          title={label}
          className={`${TOOLBAR_BTN} ${variantClass} ${className}`}
        >
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span>{label}</span>
        </motion.button>

        <AnimatePresence>
          {editMode && onEdit && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-amber-400 text-white shadow"
              title="Edit template"
            >
              <Edit2 className="h-3 w-3" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <>
      {/* ── HTML Editor Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showHtmlEditor && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex h-[80vh] w-[900px] max-w-[95%] flex-col rounded-2xl bg-white shadow-xl"
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
            >
              <div className="flex items-center justify-between border-b p-3">
                <h2 className="text-lg font-semibold">Edit File</h2>
                <button onClick={() => setShowHtmlEditor(false)}>
                  <X />
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <SmallTinyEditor
                  editorContent={tempHtml}
                  setEditorContent={setTempHtml}
                  editorRef={editorRefLocal}
                  setEditorReady={setEditorReadyLocal}
                />
              </div>

              <div className="flex justify-end gap-2 border-t p-3">
                <button
                  onClick={() => setShowHtmlEditor(false)}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setHtmlfile(tempHtml);
                    setShowHtmlEditor(false);
                  }}
                  className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Template Selector Modal ──────────────────────────── */}
      <TemplateSelectorModal
        isOpen={showTemplatePopup}
        onClose={() => setShowTemplatePopup(false)}
        onSelect={(tpl) => {
          setEditorContent(tpl.body_html || "");
          setTemplateId(tpl.id);
          toast.success(`✅ "${tpl.name}" loaded into editor`);
        }}
        crmEndpoint={crmEndpoint}
        favourites={favourites}
        setFavourites={setFavourites}
      />

      <div className="w-full min-w-0 overflow-visible rounded-2xl border border-[#E8ECF3] bg-white">
        {/* ═══ TOOLBAR DISCLOSURE — small screens only ═══ */}
        <button
          type="button"
          onClick={() => setShowTools((v) => !v)}
          aria-expanded={showTools}
          className="flex w-full items-center justify-between gap-2 border-b border-[#E8ECF3] px-3 py-2.5 text-left lg:hidden"
        >
          <span className="flex items-center gap-2 text-[13px] font-semibold text-[#2A2F3A]">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Reply tools
          </span>

          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${showTools ? "rotate-180" : ""
              }`}
          />
        </button>

        {/* ═══ TOP ACTION BAR ═══ */}
        <div
          className={`${showTools ? "flex" : "hidden"
            } flex-wrap items-center gap-2 border-b border-[#E8ECF3] px-2 py-2 lg:flex lg:px-3 lg:py-3`}
        >
          {/* AI Reply */}
          <ActionBtn
            active
            icon={Sparkles}
            label="AI Reply"
            onClick={() => {
              if (aiReplyContent === "") {
                dispatch(getAiReply(threadId, null, null, email));
              }
              insertAiReply(aiReplyContent);
            }}
            onEdit={() => navigate("/settings/templates")}
          />

          {/* AI Now */}
          <ActionBtn
            icon={Zap}
            label="AI Now"
            onClick={() => {
              dispatch(getAiReply(threadId, 1, editorContent, email));
              insertAiReply(editorContent);
            }}
            onEdit={() => navigate("/settings/templates")}
          />


          {/* Template */}
          <ActionBtn
            icon={LayoutTemplateIcon}
            label="Template"
            onClick={() => {
              setTemplateId(null);
              if (defaultTemplate && editorRef.current) {
                setEditorContent(base64ToUtf8(defaultTemplate.html_base64));
                setOpenParent(null);
              }
              setShowTemplatePopup(true);
            }}
            onEdit={() =>
              navigate("/settings/templates", { state: { templateId } })
            }
          />

          {/* Dynamic API buttons */}
          {loading ? (
            <div className="px-2">
              <LoadingChase className="p-1" />
            </div>
          ) : (
            buttons?.map((btnGroup, i) => {
              const parent = btnGroup.parent_btn;
              const children = btnGroup.child_btn;
              const isOpen = openParent === parent.id;

              return (
                <div
                  key={i}
                  className="relative inline-flex"
                  style={{ overflow: "visible" }}
                >
                  <div className="relative inline-flex">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ y: -1 }}
                      onClick={() => {
                        setTemplateId(parent.email_template_id);
                        setOpenParent(isOpen ? null : parent.id);
                      }}
                      className={`${TOOLBAR_BTN} ${isOpen ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_DEFAULT
                        }`}
                    >
                      <span>{parent.button_label}</span>
                    </motion.button>

                    <AnimatePresence>
                      {editMode && (
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/settings/templates", {
                              state: { templateId: parent.email_template_id },
                            });
                          }}
                          className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-amber-400 text-white shadow"
                          title="Edit template"
                        >
                          <Edit2 className="h-3 w-3" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {isOpen && children?.length > 0 && (
                      <motion.div
                        initial={{ y: 6, opacity: 0, scale: 0.96 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 6, opacity: 0, scale: 0.96 }}
                        transition={{
                          duration: 0.14,
                          type: "spring",
                          stiffness: 420,
                          damping: 32,
                        }}
                        className="absolute left-0 top-full z-[9999] mt-2 flex min-w-[180px] flex-col gap-1 rounded-2xl border border-[#E8ECF3] bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
                      >
                        {children.map((child, j) => (
                          <div key={j} className="relative inline-flex">
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              whileHover={{ x: 1 }}
                              onClick={() => {
                                setTemplateId(child.email_template_id);
                                setOpenParent(null);
                              }}
                              className="flex h-9 w-full items-center rounded-xl px-3 text-left text-[13px] font-medium text-[#2A2F3A] transition hover:bg-[#F6F7FB]"
                            >
                              {child.button_label}
                            </motion.button>

                            <AnimatePresence>
                              {editMode && (
                                <motion.button
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate("/settings/templates", {
                                      state: {
                                        templateId: child.email_template_id,
                                      },
                                    });
                                  }}
                                  className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-amber-400 text-white shadow"
                                  title="Edit"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
          <FirstReplyBtn email={email} threadEmails={threadEmails} />
          <DeepReplyBtn />

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleConvDone}
            disabled={contactLoading}
            title="Conversation complete"
          >
            <BiSolidMessageCheck className="h-4 w-4" />
          </motion.button>

          <IconButton
            disabled={stopLoading || contactLoading}
            loading={stopLoading}
            onClick={handleToggleStopEmails}
            label={
              contact?.contact?.is_stop === "1"
                ? "Resume Emails"
                : "Stop Future Emails"
            }
            icon={StopCircle}
            className={`w-9 h-9 rounded-xl px-4 text-[13px] font-medium shadow-none ${contact?.contact?.is_stop === "1"
              ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              : "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
          />
          {htmlfile && (
            <ActionBtn
              icon={Edit}
              label="Edit Invoice"
              onClick={() => {
                setTempHtml(htmlfile);
                setShowHtmlEditor(true);
              }}
            />
          )}
        </div>

        {/* ═══ BOTTOM ACTION BAR ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2 sm:gap-3 sm:px-3 sm:py-3">
          {/* Left utility icons */}
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ y: -1 }}
              onClick={() => setEditorContent("")}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-red-50 hover:text-red-500"
              title="Clear editor"
            >
              <Trash2 className="h-5 w-5" />
            </motion.button>

            {pdfLoading ? (
              <div className="rounded-xl border border-[#E7EAF3] bg-[#F6F7FB] px-3 py-2 text-[12px] text-gray-400">
                Preparing…
              </div>
            ) : (
              <Attachment data={files} onChange={setFiles} />
            )}

            <MicInput editorRef={editorRef} />

            {/* Edit mode toggle */}
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setEditMode((v) => !v)}
              className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition-all ${editMode
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-[#E7EAF3] bg-[#F6F7FB] text-[#2A2F3A] hover:bg-[#EEF1F7]"
                }`}
              title="Toggle edit mode"
            >
              {editMode ? (
                <>
                  <Check className="h-4 w-4" />
                  Done
                </>
              ) : (
                <>
                  <PenLine className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </div>

          {/* Right CTA */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="flex overflow-hidden rounded-xl bg-blue-600 text-white shadow-sm">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 px-4 text-[13px] font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
                onClick={handleSendClick}
                disabled={
                  checkingThreadId || sending
                }
              >
                <Send className="h-4 w-4 shrink-0" />
                Send reply
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReplyButtons;