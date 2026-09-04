import { fetchGpc, http } from "../services/api";
export const getThreadByEmail = async (email) => await fetchGpc({ params: { type: "view_email", email } });
export const getMessageById = async (id) => await fetchGpc({ params: { type: "view_msg", message_id: id } });
export const getThreadByThreadId = async (email, thread_id) => await fetchGpc({ params: { type: "view_thread", thread_id, email } });
export const getDuplicateThreads = async (email) => await fetchGpc({ params: { type: "get_dupliacte_threads", email } });
export const checkThreadId = async (thread_id) => await fetchGpc({ params: { type: "check_thread_id", thread_id } });
export const sendReply = async (formData) => await fetchGpc({ params: { type: "thread_reply" }, body: formData, method: "POST", headers: { "Content-Type": "multipart/form-data" } });