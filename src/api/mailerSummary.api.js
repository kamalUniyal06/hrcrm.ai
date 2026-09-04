import { fetchGpc } from "../services/api";

export const getMailerSummary = async ({ email, threadId }) => await fetchGpc({ params: { type: "mailer_summary", email, thread_id: threadId } })
export const regenMailerSummary = (email) => fetchGpc({ params: { type: "regenerate_summary" }, body: { email }, method: "POST" })