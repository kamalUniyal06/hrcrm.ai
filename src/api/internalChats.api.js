import { fetchGpc, http } from "../services/api";
import { getCurrentUser } from "../services/utils";


export const getAllConversations = () =>
    fetchGpc({
        method: "GET",
        params: { type: 'internal_chat', get_chat: 1 }
    });
export const getUserChat = ({ to_email }) => {
    return fetchGpc({
        method: "GET",
        params: { type: 'internal_chat', get_thread: 1, user1: getCurrentUser().description, user2: to_email }
    });
}
export const sendMessage = ({ to_email, message }) => {
    return fetchGpc({
        method: "POST",
        params: { type: 'internal_chat' },
        body: { from_email: getCurrentUser().description, to_email: to_email, message: message }
    });
}

